import { MjmlColumn, MjmlSection, MjmlText } from '@faire/mjml-react';
import { render } from '@faire/mjml-react/utils/render';
import type { EmailLayout as EmailLayoutType } from './layout';

export function otpEmail(
  EmailLayout: typeof EmailLayoutType,
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
            request that you can safely ignore this email.
          </MjmlText>
        </MjmlColumn>
      </MjmlSection>
      <MjmlSection>
        <MjmlColumn>
          {options.accountExists ? (
            <MjmlText>
              Your one time password is:{' '}
              <b>
                <span data-otp>{options.otp}</span>
              </b>
            </MjmlText>
          ) : (
            <MjmlText>
              You do not have an account with us. Please create one.
            </MjmlText>
          )}
        </MjmlColumn>
      </MjmlSection>
    </EmailLayout>,
    {}
  );

  return html;
}
