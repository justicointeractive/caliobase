import { Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Member } from '../auth/entities/member.entity';
import {
  createTestingModule,
  useTestingModule,
} from '../test/createTestingModule';
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

        assert(entityModule.EntityService);

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
    });
    it('should allow editor publish', () => {});
    it('should allow guest published list/get', () => {});
  });

  describe('comments', () => {
    const { commentService } = useTestingModule(async () => {
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
            items: ({ user: { memberId } }) => ({
              createdById: memberId,
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
        title!: string;

        @Column()
        createdById!: string;

        @ManyToOne(() => Member)
        createdBy!: Member;
      }

      const entityModule = createEntityModule(Comment);

      const module = await createTestingModule({
        imports: [entityModule],
      });

      assert(entityModule.EntityService);

      const commentService = module.get<
        InstanceType<NonNullable<typeof entityModule['EntityService']>>
      >(entityModule.EntityService);

      return {
        module,
        entityModule,
        commentService,
      };
    });

    it('should allow guest comment writes', () => {});
    it('should allow guest comment read', () => {});
    it('should allow guest comment updates', () => {});
    it('should allow moderator updates', () => {});
    it('should allow moderator deletes', () => {});
  });
});
