import { Mjml, MjmlBody, MjmlHead, MjmlPreview, MjmlTitle } from 'mjml-react';
import { ReactNode } from 'react';

export function EmailLayout(props: {
  title: string;
  preview: string;
  children: ReactNode;
}) {
  return (
    <Mjml>
      <MjmlHead>
        <MjmlTitle>{props.title}</MjmlTitle>
        <MjmlPreview>{props.preview}</MjmlPreview>
      </MjmlHead>
      <MjmlBody width={500}>{props.children}</MjmlBody>
    </Mjml>
  );
}
