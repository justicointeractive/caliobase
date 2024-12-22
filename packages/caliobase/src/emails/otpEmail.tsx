import {
  MjmlButton,
  MjmlColumn,
  MjmlSection,
  MjmlText,
} from '@faire/mjml-react';
import { render } from '@faire/mjml-react/utils/render';
import { EmailLayout } from './layout';

export function otpEmail(
  options:
    | {
        accountExists: true;
        otp: string;
      }
    | { accountExists: false }
) {
  const { html } = render(
    <EmailLayout title="One Time Password" preview="One Time Password">
      <MjmlSection>
        <MjmlColumn>
          <MjmlText>
            We've received a request to login to your account. If you did not
            request that you can safely ignore this email.{' '}
            {options.accountExists ? (
              <>If you would like to login click the button below.</>
            ) : (
              <>No account was found for this email address.</>
            )}
          </MjmlText>
        </MjmlColumn>
      </MjmlSection>
      {options.accountExists && (
        <MjmlSection>
          <MjmlColumn>
            <MjmlButton
              padding="20px"
              backgroundColor="#346DB7"
              href={options.otp}
            >
              Login
            </MjmlButton>
          </MjmlColumn>
        </MjmlSection>
      )}
    </EmailLayout>,
    {}
  );

  return html;
}
