import { Button, Flex, FlexProps, Heading } from "@chakra-ui/react";
import { motion, MotionProps } from "framer-motion";
import * as React from "react";

type ResetPromptProps = Omit<FlexProps, keyof MotionProps> & {
  onReset: () => void;
};

const MotionFlex = motion<FlexProps>(Flex);

const ResetPrompt = ({ onReset, ...rest }: ResetPromptProps): JSX.Element => {
  return (
    <MotionFlex
      px={4}
      py={4}
      width="100%"
      flexDirection="column"
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
      {...rest}
    >
      {/* <Heading fontSize="xl">Woohoo! All steps completed!</Heading> */}
      <Button
        mt={6}
        colorScheme="teal"
        size="sm"
        onClick={() => window.location.reload()}
      >
        Restart
      </Button>
    </MotionFlex>
  );
};

export default ResetPrompt;

ResetPrompt.defaultProps = {
  justifyContent: "center",
  alignItems: "center",
};
