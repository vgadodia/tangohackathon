import { ChakraProvider } from "@chakra-ui/react";
import Hero from "./Hero";
import Stats from "./Stats";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <Stats />
      <Footer />
    </>
  );
}
