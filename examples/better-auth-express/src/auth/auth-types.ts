import type { ModuleMetadata } from '@nestjs/common'
import type { betterAuth } from 'better-auth'
import type { getSession } from 'better-auth/api'


/**
 * Type representing a valid user session after authentication
 * Excludes null and undefined values from the session return type
 */
export type UserSession = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getSession>>>
>



interface AuthOptions {
  disableExceptionFilter?: boolean
  // disableTrustedOriginsCors?: boolean
  // disableBodyParser?: boolean
}

export interface AuthModuleOptions {
  auth: ReturnType<typeof betterAuth>
  options?: AuthOptions
}

export interface AuthAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<ReturnType<typeof betterAuth>> | ReturnType<typeof betterAuth>
  inject?: any[]
  options?: AuthOptions
}
