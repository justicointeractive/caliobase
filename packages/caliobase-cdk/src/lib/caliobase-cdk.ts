import { ImageResizeBehavior } from '@ji-constructs/cdk-image-resize-behavior';
import { EcsJwtKeyPair } from '@ji-constructs/ecs-jwt-keypair';
import { SecretValue, Stack } from 'aws-cdk-lib';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  ISecurityGroup,
  IVpc,
} from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import {
  AwsLogDriver,
  Compatibility,
  ContainerImage,
  Secret as EcsSecret,
  TaskDefinition,
} from 'aws-cdk-lib/aws-ecs';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  DatabaseInstanceProps,
  PostgresEngineVersion,
} from 'aws-cdk-lib/aws-rds';
import { Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class Caliobase extends Construct {
  taskDefinition: TaskDefinition;

  private bucket: Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: {
      vpc: IVpc;
      image: DockerImageAsset;
      domainName: string;
      cmsHostname: string;
      taskRole: IRole;
      taskSecurityGroup: ISecurityGroup;
      s3Bucket?: Bucket;
      s3KeyPrefix?: string;
      dbInstanceProps?: Partial<DatabaseInstanceProps>;
      environment?: Record<string, string>;
      secrets?: Record<string, EcsSecret>;
    }
  ) {
    super(scope, id);

    const { s3KeyPrefix } = props;

    const bucket = (this.bucket =
      props.s3Bucket ??
      new Bucket(this, 'Bucket', {
        cors: [
          {
            allowedMethods: [HttpMethods.GET, HttpMethods.PUT],
            allowedOrigins: ['*'],
            allowedHeaders: ['*'],
          },
        ],
      }));

    const imageResize = new ImageResizeBehavior(this, 'ImageResize', {
      createDistribution: false,
      s3BucketOrProps: bucket,
      s3OriginProps: { originPath: s3KeyPrefix },
    });

    const cloudfront = new Distribution(this, 'Distribution', {
      defaultBehavior: imageResize.behaviorOptions,
    });

    const db = new DatabaseInstance(this, 'ApiDb', {
      vpc: props.vpc,
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_14_2,
      }),
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
      ...props.dbInstanceProps,
    });

    const keys = new EcsJwtKeyPair(this, 'JwtKeys');

    const dotEnvSecret = new Secret(this, 'DotEnv', {
      secretStringValue: SecretValue.unsafePlainText(
        `# initially blank can be updated as needed`
      ),
    });

    const taskDefinition = (this.taskDefinition = new TaskDefinition(
      scope,
      'TaskDefinition',
      {
        compatibility: Compatibility.EC2,
        taskRole: props.taskRole,
      }
    ));
    const apiContainer = taskDefinition.addContainer('api', {
      image: ContainerImage.fromDockerImageAsset(props.image),
      memoryLimitMiB: 256,
      environment: {
        AWS_REGION: Stack.of(this).region,
        S3_BUCKET: bucket.bucketName,
        S3_KEY_PREFIX: s3KeyPrefix || '',
        STATIC_FILE_BASEURL: `https://${cloudfront.domainName}/`,
        CMS_HOSTNAME: props.cmsHostname,
        PORT: '8080',
        ...props.environment,
      },
      secrets: {
        PG_CONNECTION_JSON: EcsSecret.fromSecretsManager(db.secret!),
        JWT_PRIVATE_KEY: keys.ecsSecrets.privateKey,
        JWT_PUBLIC_KEY: keys.ecsSecrets.publicKey,
        DOT_ENV: EcsSecret.fromSecretsManager(dotEnvSecret),
        ...props.secrets,
      },
      logging: new AwsLogDriver({
        streamPrefix: 'api',
      }),
    });
    apiContainer.addPortMappings({ containerPort: 8080 });

    db.connections.allowDefaultPortFrom(props.taskSecurityGroup);
    this.bucket.grantReadWrite(props.taskRole);
    this.bucket.grantPutAcl(props.taskRole);

    props.taskRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: ['SES:SendRawEmail'],
        resources: ['*'],
        effect: Effect.ALLOW,
      })
    );
  }
}
