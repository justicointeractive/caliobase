import { omit } from 'lodash';
import { Column, In, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../auth';
import {
  createGuestUser,
  createTestingModule,
  createTestOrganization,
  testAnonymousUser,
  useTestingModule,
} from '../test/createTestingModule';
import { createEntityModule } from './createEntityModule';
import { CaliobaseEntity } from './decorators';

// TODO check public access through controller

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
          users: { role: 'manager' },
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

    const {
      blogPostService,
      organization,
      owner,
      otherOrganization,
      readerUser,
    } = useTestingModule(async () => {
      const entityModule = createEntityModule(BlogPost);

      const module = await createTestingModule({
        imports: [entityModule],
      });

      const blogPostService = module.get<
        InstanceType<NonNullable<typeof entityModule['EntityService']>>
      >(entityModule.EntityService);

      const { organization, owner } = await createTestOrganization(module);

      const otherOrganization = await createTestOrganization(module);

      const readerUser = await createGuestUser(module, organization);
      return {
        module,
        entityModule,
        blogPostService,
        otherOrganization,
        organization,
        owner,
        readerUser,
      };
    });

    let blogPost: BlogPost;

    it('should allow editor write draft', async () => {
      blogPost = await blogPostService.create(
        {
          title: 'test 123',
          published: false,
        },
        {
          organization,
          user: owner,
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
              user: readerUser,
            }
          )
      ).rejects.toThrow();
    });
    it('should disallow other organization owner write draft', async () => {
      await expect(
        async () =>
          await blogPostService.create(
            {
              title: 'test 123',
              published: false,
            },
            {
              organization,
              user: otherOrganization.owner,
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
          {
            organization,
            user: testAnonymousUser(organization),
          }
        )
      ).toBeNull();
      expect(
        await blogPostService.findAll(
          {
            where: { id: blogPost.id },
          },
          {
            organization,
            user: testAnonymousUser(organization),
          }
        )
      ).toEqual({ items: [], total: 0 });
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
            user: owner,
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
          {
            organization,
            user: testAnonymousUser(organization),
          }
        )
      ).not.toBeNull();
      expect(
        await blogPostService.findAll(
          {
            where: { id: blogPost.id },
          },
          {
            organization,
            user: testAnonymousUser(organization),
          }
        )
      ).toEqual({ items: [blogPost], total: 1 });
    });
    it('should allow editor list/get published', async () => {
      expect(
        await blogPostService.findOne(
          {
            where: { id: blogPost.id },
          },
          {
            organization,
            user: owner,
          }
        )
      ).not.toBeNull();
      expect(
        await blogPostService.findAll(
          {
            where: { id: blogPost.id },
          },
          {
            organization,
            user: owner,
          }
        )
      ).toEqual({ items: [blogPost], total: 1 });
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
          items: ({ user: { user } }) => ({
            createdBy: user ?? undefined,
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

    const { commentService, organization, owner, guest1, guest2 } =
      useTestingModule(async () => {
        const entityModule = createEntityModule(Comment);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const commentService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const { organization, owner } = await createTestOrganization(module);

        const guest1 = await createGuestUser(module, organization);
        const guest2 = await createGuestUser(module, organization);

        return {
          module,
          entityModule,
          commentService,
          organization,
          guest1,
          guest2,
          owner,
        };
      });

    let comment: Comment;

    it('should allow guest comment writes', async () => {
      comment = await commentService.create(
        {
          text: 'test 123',
          createdById: guest1.user?.id, // TODO: enforce createdById by service
        },
        {
          organization,
          user: guest1,
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
            user: guest1,
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
            user: guest2,
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
            user: guest1,
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
            user: guest2,
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
            user: guest2,
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
            user: owner,
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
            user: owner,
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
          items: ({ user: { user } }) => ({
            createdBy: user ?? undefined,
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

    const { videoService, organization, uploader, viewer, owner } =
      useTestingModule(async () => {
        const entityModule = createEntityModule(Video);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const videoService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const { owner, organization } = await createTestOrganization(module);

        const uploader = await createGuestUser(module, organization);
        const viewer = await createGuestUser(module, organization);

        return {
          module,
          entityModule,
          videoService,
          organization,
          uploader,
          viewer,
          owner,
        };
      });

    let video: Video;

    it('should allow guest video writes', async () => {
      video = await videoService.create(
        {
          title: 'test 123',
          createdById: uploader.user?.id, // TODO: enforce createdById by service
          visibility: 'unlisted',
        },
        {
          organization,
          user: uploader,
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
            user: uploader,
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
            user: viewer,
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
            user: uploader,
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
            user: viewer,
          }
        )
      ).toEqual({ items: [], total: 0 });
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
            user: viewer,
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
            user: viewer,
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
            user: owner,
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
            user: owner,
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
          users: ({ user }) => user != null,
        },
      ],
    })
    class Downloadable {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      title!: string;
    }

    const { downloadableService, organization, owner, user } = useTestingModule(
      async () => {
        const entityModule = createEntityModule(Downloadable);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const downloadableService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const { organization, owner } = await createTestOrganization(module);

        const user = await createGuestUser(module, organization);

        return {
          module,
          entityModule,
          downloadableService,
          organization,
          user,
          owner,
        };
      }
    );

    let downloadable: Downloadable;

    it('should allow moderator create', async () => {
      downloadable = await downloadableService.create(
        {
          title: 'test 123',
        },
        {
          organization,
          user: owner,
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
            user: user,
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
            user: user,
          }
        )
      ).toMatchObject({
        items: [omit(downloadable, ['organization'])],
        total: 1,
      });
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
              user: testAnonymousUser(organization),
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
              user: testAnonymousUser(organization),
            }
          )
      ).rejects.toThrow();
    });
  });

  /*   xdescribe('document sharing', () => {
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
      documentOwner,
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

      const { organization, owner: moderator } = await createTestOrganization(
        module
      );

      const documentOwner = await createGuestUser(module, organization);
      const sharedWithUser = await createGuestUser(module, organization);
      const notSharedWithUser = await createGuestUser(module, organization);

      return {
        module,
        entityModule,
        documentService,
        organization,
        moderator,
        documentOwner,
        sharedWithUser,
        notSharedWithUser,
      };
    });

    let document: Document;

    it('should allow user to create', async () => {
      document = await documentService.create(
        {
          title: 'test 123',
        },
        {
          organization,
          user: documentOwner,
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
            user: documentOwner,
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
            user: documentOwner,
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
              user: testAnonymousUser(organization),
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
              user: testAnonymousUser(organization),
            }
          )
      ).rejects.toThrow();
    });
  });

  xdescribe('many video channel organization', () => {
    @CaliobaseEntity<Channel>({
      controller: { name: 'downloadable' },
      accessPolicy: [
        {
          effect: 'allow',
          action: '*',
          users: { role: 'moderator' },
        },
      ],
    })
    class Channel {
      @PrimaryGeneratedColumn('uuid')
      id!: string;

      @Column()
      name!: string;
    }

    const { channelService, organization, owner, otherUser } = useTestingModule(
      async () => {
        const entityModule = createEntityModule(Channel);

        const module = await createTestingModule({
          imports: [entityModule],
        });

        const channelService = module.get<
          InstanceType<NonNullable<typeof entityModule['EntityService']>>
        >(entityModule.EntityService);

        const { organization, owner } = await createTestOrganization(module);
        const otherUser = await createGuestUser(module, organization);

        return {
          module,
          entityModule,
          channelService,
          organization,
          owner,
          otherUser,
        };
      }
    );

    let channel: Channel;

    it('should allow user to create', async () => {
      channel = await channelService.create(
        {
          name: faker.commerce.productName(),
        },
        {
          organization,
          user: owner,
        }
      );

      expect(channel).not.toBeNull();
    });
    it('should allow user read/list', async () => {
      expect(
        await channelService.findOne(
          {
            where: {
              id: channel.id,
            },
          },
          {
            organization,
            user: otherUser,
          }
        )
      ).not.toBeNull();
      expect(
        await channelService.findAll(
          {
            where: {
              id: channel.id,
            },
          },
          {
            organization,
            user: otherUser,
          }
        )
      ).toHaveLength(1);
    });
    it('should disallow anonymous read/list', async () => {
      await expect(
        async () =>
          await channelService.findOne(
            {
              where: {
                id: channel.id,
              },
            },
            {
              organization,
              user: testAnonymousUser(organization),
            }
          )
      ).rejects.toThrow();
      await expect(
        async () =>
          await channelService.findAll(
            {
              where: {
                id: channel.id,
              },
            },
            {
              organization,
              user: testAnonymousUser(organization),
            }
          )
      ).rejects.toThrow();
    });
  }); */
});
