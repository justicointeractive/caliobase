import {
  MjmlButton,
  MjmlColumn,
  MjmlSection,
  MjmlText,
} from '@faire/mjml-react';
import { render } from '@faire/mjml-react/utils/render';
import { EmailLayout } from './layout';

export function forgotPasswordEmail(
  options:
    | {
        accountExists: true;
        resetUrl: string;
      }
    | { accountExists: false }
) {
  const { html } = render(
    <EmailLayout title="Reset password" preview="Password reset requested">
      <MjmlSection>
        <MjmlColumn>
          <MjmlText>
            We've received a request to reset your password. If you did not
            request that you can safely ignore this email.{' '}
            {options.accountExists ? (
              <>
                If you would like to reset your password click the button below.
              </>
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
              href={options.resetUrl}
            >
              Reset Password
            </MjmlButton>
          </MjmlColumn>
        </MjmlSection>
      )}
    </EmailLayout>,
    {}
  );

  return html;
}
