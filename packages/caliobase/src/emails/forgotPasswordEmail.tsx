import {
  Mjml,
  MjmlBody,
  MjmlButton,
  MjmlColumn,
  MjmlHead,
  MjmlPreview,
  MjmlSection,
  MjmlText,
  MjmlTitle,
  render,
} from 'mjml-react';

export function forgotPasswordEmail(options: { resetUrl: string }) {
  const { html } = render(
    <Mjml>
      <MjmlHead>
        <MjmlTitle>Reset password</MjmlTitle>
        <MjmlPreview>Password reset requested</MjmlPreview>
      </MjmlHead>
      <MjmlBody width={500}>
        <MjmlSection>
          <MjmlColumn>
            <MjmlText>
              We've received a request to reset your password. If you did not
              request that you can safely ignore this email. If you would like
              to reset your password click the button below.
            </MjmlText>
          </MjmlColumn>
        </MjmlSection>

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
      </MjmlBody>
    </Mjml>,
    {}
  );

  return html;
}
