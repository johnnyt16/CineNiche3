declare module '@stytch/react' {
  import { ReactNode } from 'react';
  
  export interface StytchProviderProps {
    children: ReactNode;
    stytch: any; // The initialized Stytch client
    config: {
      publicToken: string;
      loginRedirectURL?: string;
      signupRedirectURL?: string;
      sessionOptions?: {
        duration_minutes?: number;
      };
    };
  }
  
  export function StytchProvider(props: StytchProviderProps): JSX.Element;
  
  export interface StytchUIConfig {
    products: string[];
    sessionOptions?: {
      duration_minutes?: number;
    };
  }
  
  export function StytchLogin(props: { config: StytchUIConfig }): JSX.Element;
  
  export default StytchProvider;
}

declare module '@stytch/vanilla-js' {
  export class StytchUIClient {
    constructor(publicToken: string);
    // Add other methods as needed
  }
  
  export enum Products {
    oauth,
    emailMagicLinks,
    emailOTP,
    smsOTP,
    whatsappOTP,
    passwords,
    biometrics,
    webauthn,
    authorizationCodes,
    crypto,
    b2b,
    biometricAuthorization,
    deviceCredentials
  }
  
  export default StytchUIClient;
} 