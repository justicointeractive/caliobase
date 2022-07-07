import { Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../auth';
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
          action: ['create', 'update', 'delete'],
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
          user: { role: ['editor'] },
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
              user: { role: [] },
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
            user: { role: ['editor'] },
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
          action: ['update', 'delete'],
          items: ({ user: { userId } }) => ({
            createdById: userId,
          }),
        },
        {
          effect: 'allow',
          action: ['update', 'delete'],
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
          name: 'Test Organization',
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
            role: [],
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
              role: [],
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
              role: [],
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
              role: [],
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
              role: [],
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
              role: [],
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
              role: ['moderator'],
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
              role: ['moderator'],
            },
          }
        )
      ).toHaveLength(1);
    });
  });
});
