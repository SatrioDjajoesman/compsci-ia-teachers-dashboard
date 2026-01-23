import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Tailwind,
  Text,
  Font,
} from '@react-email/components';
import * as React from 'react';

interface ParentEmailProps {
  subject: string;
  content: string;
  previewText?: string;
}

export const ParentEmail = ({
  subject = 'School Notification',
  content = '',
  previewText = 'Important update from school',
}: ParentEmailProps) => {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Arial"
          webFont={{
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="bg-white my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
              {subject}
            </Heading>
            <Text className="text-black text-[14px] leading-[24px]">
              {content ? content.split(/(?:\r\n|\r|\n|\\n)/g).map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              )) : 'No content provided.'}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ParentEmail;
