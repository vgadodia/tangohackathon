// import { ReactNode } from "react";
import {
  Stack,
  Container,
  Box,
  Flex,
  Text,
  Heading,
  SimpleGrid,
} from "@chakra-ui/react";

export default function Stats() {
  return (
    <Box bg="purple.700" position={"relative"}>
      <Flex
        flex={1}
        zIndex={0}
        display={{ base: "none", lg: "flex" }}
        backgroundImage="url('/images/dance.jpg')"
        backgroundSize={"cover"}
        backgroundPosition="center"
        backgroundRepeat="no-repeat"
        position={"absolute"}
        width={"50%"}
        insetY={0}
        right={0}
      >
        <Flex
          bgGradient={"linear(to-r, purple.700 10%, transparent)"}
          w={"full"}
          h={"full"}
        />
      </Flex>
      <Container maxW={"7xl"} zIndex={10} position={"relative"}>
        <Stack direction={{ base: "column", lg: "row" }}>
          <Stack
            flex={1}
            color={"gray.400"}
            justify={{ lg: "center" }}
            py={{ base: 4, md: 20, xl: 60 }}
          >
            <Box mb={{ base: 8, md: 20 }}>
              <Text
                fontFamily={"heading"}
                fontWeight={700}
                textTransform={"uppercase"}
                mb={3}
                fontSize={"xl"}
                color={"gray.400"}
              >
                Technology
              </Text>
              <Heading
                color={"white"}
                mb={5}
                fontSize={{ base: "3xl", md: "5xl" }}
              >
                Intelligent dance coaching, brought to you.
              </Heading>
              <Text fontSize={"xl"} color={"gray.300"}>
                Tango allows you to improve upon your dancing skills with
                nothing but your laptop, and from the comfort of your own home.
                Our computer vision technology provides you with continous
                feedback and accuracy scores as you perform.
              </Text>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
              {stats.map((stat) => (
                <Box key={stat.title}>
                  <Text
                    fontFamily={"heading"}
                    fontSize={"xl"}
                    color={"white"}
                    mb={3}
                    fontWeight={600}
                  >
                    {stat.title}
                  </Text>
                  <Text fontSize={"xl"} color={"gray.300"}>
                    {stat.content}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Stack>
          <Flex flex={1} />
        </Stack>
      </Container>
    </Box>
  );
}

const StatsText = ({ children }) => (
  <Text as={"span"} fontWeight={700} color={"white"}>
    {children}
  </Text>
);

const stats = [
  {
    title: "Live Webcam Analysis",
    content: (
      <>
        Track your accuracy using our live graphical annotations and statistics
        as you practice.
      </>
    ),
  },
  {
    title: "Post-Performance Report",
    content: (
      <>Analyze mistakes in your routine using our post-practice analytics.</>
    ),
  },
  {
    title: "Dynamic Time Warping",
    content: (
      <>
        Utilizes Dynamic Time Warping and Vector Calculus to minimize time and
        space inaccuracies between clips.
      </>
    ),
  },
  {
    title: "Customizable Dance",
    content: (
      <>
        Upload and get feedback on any dance routine of your choice, or choose
        the latest trending dances from our library.
      </>
    ),
  },
];
