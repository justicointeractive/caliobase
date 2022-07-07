import { faker } from '@faker-js/faker';
import { Column, In, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AclItem, EntityAcl, User } from '../auth';
import { AuthService } from '../auth/auth.service';
import { OrganizationService } from '../auth/organization.service';
import {
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
import { fakeUser } from '../test/fakeUser';
import { createEntityModule } from './createEntityModule';
import { CaliobaseEntity } from './decorators';
import assert = require('assert');

describe('access policy', () => {
  describe('blog posts', () => {
    @CaliobaseEntity<BlogPost>({
      controller: { name: 'post' },
      accessPolicy: [
        {
          effect: 'allow',
          action: ['get', 'list'],
          items: { published: true },
        },
        {
          effect: 'allow',
          action: '*',
          users: { role: 'editor' },
        },
      ],
    })
    class BlogPost {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      title!: string;

      @Column()
      published!: boolean;
    }

    const { blogPostService, organization } = useTestingModule(
      async () => {
        const entityModule = createEntityModule(BlogPost);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const blogPostService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        return {
          module,
          entityModule,
          blogPostService,
        };
      },
      { createRoot: true }
    );

    assert(organization);

    let blogPost: BlogPost;

    it('should allow editor write draft', async () => {
      blogPost = await blogPostService.create(
        {
          title: 'test 123',
          published: false,
        },
        {
          organization,
          user: { roles: ['editor'] },
        }
      );

      expect(blogPost).not.toBeNull();
    });
    it('should disallow non editor write draft', async () => {
      await expect(
        async () =>
          await blogPostService.create(
            {
              title: 'test 123',
              published: false,
            },
            {
              organization,
              user: { roles: [] },
            }
          )
      ).rejects.toThrow();
    });
    it('should disallow guest unpublished list/get', async () => {
      expect(
        await blogPostService.findOne(
          {
            where: { id: blogPost.id },
          },
          { organization, user: {} }
        )
      ).toBeNull();
      expect(
        await blogPostService.findAll(
          {
            where: { id: blogPost.id },
          },
          { organization, user: {} }
        )
      ).toHaveLength(0);
    });
    it('should allow editor publish', async () => {
      blogPost = (
        await blogPostService.update(
          { id: blogPost.id },
          {
            published: true,
          },
          {
            organization,
            user: { roles: ['editor'] },
          }
        )
      )[0];

      expect(blogPost.published).toEqual(true);
    });
    it('should allow guest published list/get', async () => {
      expect(
        await blogPostService.findOne(
          {
            where: { id: blogPost.id },
          },
          { organization, user: {} }
        )
      ).not.toBeNull();
      expect(
        await blogPostService.findAll(
          {
            where: { id: blogPost.id },
          },
          { organization, user: {} }
        )
      ).toHaveLength(1);
    });
  });

  describe('comments', () => {
    @CaliobaseEntity<Comment>({
      controller: { name: 'comment' },
      accessPolicy: [
        {
          effect: 'allow',
          action: ['create', 'get', 'list'],
        },
        {
          effect: 'allow',
          action: '*',
          items: ({ user: { userId } }) => ({
            createdById: userId,
          }),
        },
        {
          effect: 'allow',
          action: '*',
          users: { role: 'moderator' },
        },
      ],
    })
    class Comment {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      text!: string;

      @Column()
      createdById!: string;

      @ManyToOne(() => User)
      createdBy!: User;
    }

    const { commentService, organization, user, user2, moderator } =
      useTestingModule(async () => {
        const entityModule = createEntityModule(Comment);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const commentService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const userService = module.get<AuthService>(AuthService);
        const orgService = module.get<OrganizationService>(OrganizationService);

        const user = await userService.createUserWithPassword(fakeUser());
        const user2 = await userService.createUserWithPassword(fakeUser());
        const moderator = await userService.createUserWithPassword(fakeUser());

        const organization = await orgService.createOrganization(user.id, {
          name: faker.company.companyName(),
        });

        return {
          module,
          entityModule,
          commentService,
          organization,
          user,
          user2,
          moderator,
        };
      });

    assert(organization);

    let comment: Comment;

    it('should allow guest comment writes', async () => {
      comment = await commentService.create(
        {
          text: 'test 123',
          createdById: user.id, // TODO: enforce createdById by service
        },
        {
          organization,
          user: {
            userId: user.id,
            roles: [],
          },
        }
      );

      expect(comment).not.toBeNull();
    });
    it('should allow guest comment read', async () => {
      expect(
        await commentService.findOne(
          {
            where: {
              id: comment.id,
            },
          },
          {
            organization,
            user: {
              userId: user.id,
              roles: [],
            },
          }
        )
      ).not.toBeNull();
      expect(
        await commentService.findOne(
          {
            where: {
              id: comment.id,
            },
          },
          {
            organization,
            user: {
              userId: user2.id,
              roles: [],
            },
          }
        )
      ).not.toBeNull();
    });
    it('should allow guest comment updates', async () => {
      expect(
        await commentService.update(
          {
            id: comment.id,
          },
          {
            text: 'test 234',
          },
          {
            organization,
            user: {
              userId: user.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(1);
    });
    it('should disallow other guest comment updates', async () => {
      expect(
        await commentService.update(
          {
            id: comment.id,
          },
          {
            text: 'test 345',
          },
          {
            organization,
            user: {
              userId: user2.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(0);
    });
    it('should disallow other guest comment remove', async () => {
      expect(
        await commentService.remove(
          {
            id: comment.id,
          },
          {
            organization,
            user: {
              userId: user2.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(0);
    });
    it('should allow moderator updates', async () => {
      expect(
        await commentService.update(
          {
            id: comment.id,
          },
          {
            text: 'test 456',
          },
          {
            organization,
            user: {
              userId: moderator.id,
              roles: ['moderator'],
            },
          }
        )
      ).toHaveLength(1);
    });
    it('should allow moderator deletes', async () => {
      expect(
        await commentService.remove(
          {
            id: comment.id,
          },
          {
            organization,
            user: {
              userId: moderator.id,
              roles: ['moderator'],
            },
          }
        )
      ).toHaveLength(1);
    });
  });

  describe('video sharing', () => {
    @CaliobaseEntity<Video>({
      controller: { name: 'video' },
      accessPolicy: [
        {
          effect: 'allow',
          action: ['create'],
        },
        {
          effect: 'allow',
          action: ['get'],
          items: {
            visibility: In(['public', 'unlisted']),
          },
        },
        {
          effect: 'allow',
          action: ['list'],
          items: {
            visibility: In(['public']),
          },
        },
        {
          effect: 'allow',
          action: '*',
          items: ({ user: { userId } }) => ({
            createdById: userId,
          }),
        },
        {
          effect: 'allow',
          action: '*',
          users: { role: 'moderator' },
        },
      ],
    })
    class Video {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      title!: string;

      @Column()
      visibility!: 'private' | 'unlisted' | 'public';

      @Column()
      createdById!: string;

      @ManyToOne(() => User)
      createdBy!: User;
    }

    const { videoService, organization, uploader, viewer, moderator } =
      useTestingModule(async () => {
        const entityModule = createEntityModule(Video);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const videoService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const userService = module.get<AuthService>(AuthService);
        const orgService = module.get<OrganizationService>(OrganizationService);

        const uploader = await userService.createUserWithPassword(fakeUser());
        const viewer = await userService.createUserWithPassword(fakeUser());
        const moderator = await userService.createUserWithPassword(fakeUser());

        const organization = await orgService.createOrganization(uploader.id, {
          name: faker.company.companyName(),
        });

        return {
          module,
          entityModule,
          videoService,
          organization,
          uploader,
          viewer,
          moderator,
        };
      });

    assert(organization);

    let video: Video;

    it('should allow guest video writes', async () => {
      video = await videoService.create(
        {
          title: 'test 123',
          createdById: uploader.id, // TODO: enforce createdById by service
          visibility: 'unlisted',
        },
        {
          organization,
          user: {
            userId: uploader.id,
            roles: [],
          },
        }
      );

      expect(video).not.toBeNull();
    });
    it('should allow guest video read', async () => {
      expect(
        await videoService.findOne(
          {
            where: {
              id: video.id,
            },
          },
          {
            organization,
            user: {
              userId: uploader.id,
              roles: [],
            },
          }
        )
      ).not.toBeNull();
      expect(
        await videoService.findOne(
          {
            where: {
              id: video.id,
            },
          },
          {
            organization,
            user: {
              userId: viewer.id,
              roles: [],
            },
          }
        )
      ).not.toBeNull();
    });
    it('should allow guest video updates', async () => {
      expect(
        await videoService.update(
          {
            id: video.id,
          },
          {
            title: 'test 234',
          },
          {
            organization,
            user: {
              userId: uploader.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(1);
    });
    it('should disallow viewer video list unlisted', async () => {
      expect(
        await videoService.findAll(
          {
            where: {
              id: video.id,
            },
          },
          {
            organization,
            user: {
              userId: viewer.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(0);
    });
    it('should disallow viewer video updates', async () => {
      expect(
        await videoService.update(
          {
            id: video.id,
          },
          {
            title: 'test 345',
          },
          {
            organization,
            user: {
              userId: viewer.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(0);
    });
    it('should disallow viewer video remove', async () => {
      expect(
        await videoService.remove(
          {
            id: video.id,
          },
          {
            organization,
            user: {
              userId: viewer.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(0);
    });
    it('should allow moderator updates', async () => {
      expect(
        await videoService.update(
          {
            id: video.id,
          },
          {
            title: 'test 456',
          },
          {
            organization,
            user: {
              userId: moderator.id,
              roles: ['moderator'],
            },
          }
        )
      ).toHaveLength(1);
    });
    it('should allow moderator deletes', async () => {
      expect(
        await videoService.remove(
          {
            id: video.id,
          },
          {
            organization,
            user: {
              userId: moderator.id,
              roles: ['moderator'],
            },
          }
        )
      ).toHaveLength(1);
    });
  });

  describe('no anonymous access', () => {
    @CaliobaseEntity<Downloadable>({
      controller: { name: 'downloadable' },
      accessPolicy: [
        {
          effect: 'allow',
          action: '*',
          users: { role: 'moderator' },
        },
        {
          effect: 'allow',
          action: ['get', 'list'],
          users: ({ userId }) => userId != null,
        },
      ],
    })
    class Downloadable {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      title!: string;
    }

    const { downloadableService, organization, moderator, user } =
      useTestingModule(async () => {
        const entityModule = createEntityModule(Downloadable);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const downloadableService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const userService = module.get<AuthService>(AuthService);
        const orgService = module.get<OrganizationService>(OrganizationService);

        const moderator = await userService.createUserWithPassword(fakeUser());
        const user = await userService.createUserWithPassword(fakeUser());

        const organization = await orgService.createOrganization(moderator.id, {
          name: faker.company.companyName(),
        });

        return {
          module,
          entityModule,
          downloadableService,
          organization,
          user,
          moderator,
        };
      });

    assert(organization);

    let downloadable: Downloadable;

    it('should allow moderator create', async () => {
      downloadable = await downloadableService.create(
        {
          title: 'test 123',
        },
        {
          organization,
          user: {
            userId: moderator.id,
            roles: ['moderator'],
          },
        }
      );

      expect(downloadable).not.toBeNull();
    });
    it('should allow user read/list', async () => {
      expect(
        await downloadableService.findOne(
          {
            where: {
              id: downloadable.id,
            },
          },
          {
            organization,
            user: {
              userId: user.id,
              roles: [],
            },
          }
        )
      ).not.toBeNull();
      expect(
        await downloadableService.findAll(
          {
            where: {
              id: downloadable.id,
            },
          },
          {
            organization,
            user: {
              userId: user.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(1);
    });
    it('should disallow anonymous read/list', async () => {
      await expect(
        async () =>
          await downloadableService.findOne(
            {
              where: {
                id: downloadable.id,
              },
            },
            {
              organization,
              user: {},
            }
          )
      ).rejects.toThrow();
      await expect(
        async () =>
          await downloadableService.findAll(
            {
              where: {
                id: downloadable.id,
              },
            },
            {
              organization,
              user: {},
            }
          )
      ).rejects.toThrow();
    });
  });

  xdescribe('document sharing', () => {
    @CaliobaseEntity<Document>({
      controller: { name: 'downloadable' },
      accessPolicy: [
        {
          effect: 'allow',
          action: '*',
          users: { role: 'moderator' },
        },
      ],
    })
    class Document {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      title!: string;

      @EntityAcl(Document)
      acl!: AclItem<Document>[];
    }

    const {
      documentService,
      organization,
      moderator,
      ownerUser,
      sharedWithUser,
      notSharedWithUser,
    } = useTestingModule(async () => {
      const entityModule = createEntityModule(Document);

      const module = await createTestingModule({
        imports: [entityModule],
      });

      const documentService = module.get<
        InstanceType<NonNullable<typeof entityModule['EntityService']>>
      >(entityModule.EntityService);

      const userService = module.get<AuthService>(AuthService);
      const orgService = module.get<OrganizationService>(OrganizationService);

      const moderator = await userService.createUserWithPassword(fakeUser());
      const ownerUser = await userService.createUserWithPassword(fakeUser());
      const sharedWithUser = await userService.createUserWithPassword(
        fakeUser()
      );
      const notSharedWithUser = await userService.createUserWithPassword(
        fakeUser()
      );

      const organization = await orgService.createOrganization(moderator.id, {
        name: faker.company.companyName(),
      });

      return {
        module,
        entityModule,
        documentService,
        organization,
        ownerUser,
        moderator,
        sharedWithUser,
        notSharedWithUser,
      };
    });

    assert(organization);

    let document: Document;

    it('should allow user to create', async () => {
      document = await documentService.create(
        {
          title: 'test 123',
        },
        {
          organization,
          user: {
            userId: moderator.id,
            roles: ['moderator'],
          },
        }
      );

      expect(document).not.toBeNull();
    });
    it('should allow user read/list', async () => {
      expect(
        await documentService.findOne(
          {
            where: {
              id: document.id,
            },
          },
          {
            organization,
            user: {
              userId: ownerUser.id,
              roles: [],
            },
          }
        )
      ).not.toBeNull();
      expect(
        await documentService.findAll(
          {
            where: {
              id: document.id,
            },
          },
          {
            organization,
            user: {
              userId: ownerUser.id,
              roles: [],
            },
          }
        )
      ).toHaveLength(1);
    });
    it('should disallow anonymous read/list', async () => {
      await expect(
        async () =>
          await documentService.findOne(
            {
              where: {
                id: document.id,
              },
            },
            {
              organization,
              user: {},
            }
          )
      ).rejects.toThrow();
      await expect(
        async () =>
          await documentService.findAll(
            {
              where: {
                id: document.id,
              },
            },
            {
              organization,
              user: {},
            }
          )
      ).rejects.toThrow();
    });
  });
});
