export const DEPLOYMENT_CLIENT_OPTIONS = 'DEPLOYMENT_CLIENT_OPTIONS';

export interface DeploymentClientOptions {
  deploymentServiceUrl: string;
  internalJwtSecret: string;
}
