import { useState, useRef, useEffect } from "react";

import { useRecordWebcam } from "react-record-webcam";
import { CountdownCircleTimer } from "react-countdown-circle-timer";

import {
  Box,
  Text,
  Button,
  Center,
  VStack,
  Flex,
  BeatLoader,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useColorModeValue,
  Image,
  Tooltip,
  Heading,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tfoot,
  Tr,
  Th,
  Td,
  TableCaption,
  Input,
} from "@chakra-ui/react";

import { PieChart } from "react-minimal-pie-chart";

import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  Tooltip as chartTooltip,
  ReferenceDot,
} from "recharts";

import {
  AiOutlineCloudUpload,
  AiFillFileAdd,
  AiOutlineCheck,
  AiOutlineCheckCircle,
} from "react-icons/ai";
import { MdPhotoLibrary } from "react-icons/md";
import { FaVideo } from "react-icons/fa";
import Navbar from "./Navbar";

import { Step, Steps, useSteps } from "chakra-ui-steps";
import StepButtons from "./StepButtons.tsx";
import ResetPrompt from "./ResetPrompt.tsx";

import MediaPipe from "./MediaPipe";
import LandmarkGrid from "./LandmarkGrid";
import { BsStar, BsStarFill, BsStarHalf } from "react-icons/bs";
import { FiShoppingCart } from "react-icons/fi";

import "./styles.css";

const renderTime = ({ remainingTime }) => {
  // if (remainingTime === 0) {
  //   return <div className="timer">Too lale...</div>;
  // }

  return (
    <div className="timer">
      <div className="text">Remaining</div>
      <div className="value">{remainingTime}</div>
      <div className="text">seconds</div>
    </div>
  );
};

export default function Demo() {
  const { nextStep, prevStep, reset, activeStep } = useSteps({
    initialStep: 0,
  });

  const { isOpen, onOpen, onClose } = useDisclosure();

  const [loading, setLoading] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(true); //TODO: change to false
  const [buttonText, setButtonText] = useState("Start Recording");
  const [buttonColor, setButtonColor] = useState("teal");
  const [selectedThumbnail, setSelectedThumbnail] = useState("");
  const [confirmedSelectedThumbnail, setConfirmedSelectedThumbnail] =
    useState("");
  const [coachPlaying, setCoachPlaying] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameModal, setUsernameModal] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState({ data: [] });

  const coachVideoFileRef = useRef(null);
  const [coachVideoFile, setCoachVideoFile] = useState(null);
  const coachVideoRef = useRef(null);
  const [coachVideoLength, setCoachVideoLength] = useState(0);

  const [coachFileId, setCoachFileId] = useState("");

  const [coachAnnotations, setCoachAnnotations] = useState([]);
  const [accuracy, setAccuracy] = useState([]);
  const [finalResults, setFinalResults] = useState({});

  const finalVideoRef = useRef(null);

  const handleUploadClick = () => {
    coachVideoFileRef.current.click();
  };

  const handleChangeVideo = (event) => {
    setCoachVideoFile(event.target.files[0]);
    // console.log(coachVideoRef.current);
  };

  const uploadCoachVideo = async () => {
    // event.preventDefault();
    setLoading(true);
    // upload the video here

    if (confirmedSelectedThumbnail !== "") {
      const formData = new FormData();
      setCoachVideoLength(coachVideoRef.current.duration);

      formData.append("file", confirmedSelectedThumbnail);

      const response = await fetch("http://127.0.0.1:8000/coachvideo1", {
        method: "POST",
        body: formData,
      });

      const data = JSON.parse(await response.text());

      console.log(data);
      setCoachFileId(data.fileid);

      setCoachAnnotations(data["data"]);
    } else {
      const formData = new FormData();
      setCoachVideoLength(coachVideoRef.current.duration);

      formData.append("file", coachVideoFile);

      const response = await fetch("http://127.0.0.1:8000/coachvideo", {
        method: "POST",
        body: formData,
      });

      const data = JSON.parse(await response.text());

      console.log(data);
      setCoachFileId(data.fileid);

      setCoachAnnotations(data["data"]);
    }

    stepCompleted[activeStep] = true;
    setLoading(false);
    nextStep();
  };

  const confirmThumbnail = () => {
    setConfirmedSelectedThumbnail(selectedThumbnail);
    onClose();
  };

  const recordWebcam = useRecordWebcam();

  const uploadRecording2 = async () => {
    setButtonText("Uploading...");
    setLoading(true);
    setShowTimer(false);
    setCoachPlaying(false);
    setUsernameModal(true);
    document.getElementById("coachFilePlaying").pause();
  };

  const uploadRecording = async () => {
    setButtonText("Uploading...");
    setLoading(true);
    setShowTimer(false);
    setCoachPlaying(false);
    document.getElementById("coachFilePlaying").pause();

    const blob = await recordWebcam.getRecording();

    // upload here

    if (confirmedSelectedThumbnail !== "") {
      const formData = new FormData();

      formData.append("file1", confirmedSelectedThumbnail);
      formData.append("file2", blob);

      console.log(formData);

      const response = await fetch("http://127.0.0.1:8000/uploadfile1", {
        method: "POST",
        body: formData,
      });

      const data = JSON.parse(await response.text());

      console.log("uploadfile:", data);
      setFinalResults(data);

      // /update_leaderboard - username, video_name, score
      let score = (Math.round(10 * data["overall_score"]) / 10).toFixed(1);
      console.log({
        username: username,
        video_name: confirmedSelectedThumbnail,
        score: score,
      });

      const formData1 = new FormData();
      formData1.append("username", username);
      formData1.append("video_name", confirmedSelectedThumbnail);
      formData1.append("score", score);

      const response1 = await fetch(
        "http://127.0.0.1:8000/update_leaderboard",
        {
          method: "POST",
          body: formData1,
        }
      );

      console.log("response", response1.text());

      // const formData2 = new FormData();
      // formData2.append("data", {
      //   video_name: confirmedSelectedThumbnail,
      //   score: score,
      // });

      const response2 = await fetch("http://127.0.0.1:8000/get_leaderboard", {
        method: "POST",
        body: formData1,
      });

      const leaderboardData = JSON.parse(await response2.text());
      console.log("leaderboarddata", leaderboardData);
      setLeaderboardData(leaderboardData);
    } else {
      const formData = new FormData();

      formData.append("file1", coachVideoFile);
      formData.append("file2", blob);

      console.log(formData);

      const response = await fetch("http://127.0.0.1:8000/uploadfile", {
        method: "POST",
        body: formData,
      });

      const data = JSON.parse(await response.text());

      console.log("uploadfile:", data);
      setFinalResults(data);
    }

    setLoading(false);
    // move to next step
    nextStep();
  };

  useEffect(() => {
    recordWebcam.open();
    localStorage.clear();
  }, []);

  const startRecording = () => {
    document
      .getElementById("coachFilePlaying")
      .play()
      .then(() => document.getElementById("coachFilePlaying").pause());

    setButtonColor("red");
    setButtonText("3...");
    setTimeout(() => {
      setButtonText("2...");
    }, 1000);
    setTimeout(() => {
      setButtonText("1...");
    }, 2000);
    setTimeout(() => {
      setButtonText("Recording");
      setLoading(true);
      setShowTimer(true);
      localStorage.setItem("record-start", Date.now());
      setCoachPlaying(true);
      document.getElementById("coachFilePlaying").play();

      recordWebcam.start().then(() => {
        setTimeout(() => {
          recordWebcam.stop().then(() => {
            if (confirmedSelectedThumbnail) {
              uploadRecording2();
            } else {
              uploadRecording();
            }
          });
        }, 1000 * coachVideoLength);
      });
    }, 3000);
  };

  const handleClickThumbnail = (fileName) => {
    console.log(fileName);
    setSelectedThumbnail(fileName);
  };

  const libraryData = [
    {
      imageURL: "/images/thumbnail1.jpeg",
      name: "Hot Shower",
      fileName: "chance_hot_shower.mp4",
    },
    {
      imageURL: "/images/thumbnail2.jpeg",
      name: "Finesse Walk",
      fileName: "finesse_step.mp4",
    },
    {
      imageURL: "/images/thumbnail3.jpeg",
      name: "Renegade",
      fileName: "renegade.mp4",
    },
    // {
    //   imageURL: "/images/thumbnail4.jpeg",
    //   name: "Twitter Dance",
    // },
  ];

  const uploaddancevideo = (
    <>
      <Flex py={4}>
        <Center flexShrink="1">
          {(coachVideoFile || confirmedSelectedThumbnail !== "") && (
            <video
              ref={coachVideoRef}
              src={
                confirmedSelectedThumbnail !== ""
                  ? `http://127.0.0.1:8000/getexisting?fileid=${confirmedSelectedThumbnail}`
                  : URL.createObjectURL(coachVideoFile)
              }
              controls
            />
          )}
        </Center>
        <Box
          width="full"
          height="70vh"
          // maxHeight="100%"
          direction="row"
          display="flex"
          justifyContent="center"
          alignItems="center"
          textAlign="center"
        >
          <Box direction="column" width="70%">
            {(coachVideoFile || confirmedSelectedThumbnail !== "") && (
              <>
                <Button
                  leftIcon={<AiOutlineCloudUpload />}
                  colorScheme="blue"
                  variant="solid"
                  size="lg"
                  onClick={uploadCoachVideo}
                  isLoading={loading}
                  mb="3"
                  w="80%"
                >
                  Confirm Video
                </Button>
                <br />
              </>
            )}
            <Button
              leftIcon={<AiFillFileAdd />}
              colorScheme="teal"
              variant="solid"
              size="lg"
              onClick={handleUploadClick}
              disabled={loading}
              w={
                coachVideoFile || confirmedSelectedThumbnail !== "" ? "80%" : ""
              }
            >
              Select{" "}
              {coachVideoFile || confirmedSelectedThumbnail !== ""
                ? "Different"
                : "a"}{" "}
              Video
            </Button>
            {!(coachVideoFile || confirmedSelectedThumbnail !== "") && (
              <Button
                leftIcon={<MdPhotoLibrary />}
                colorScheme="purple"
                variant="solid"
                size="lg"
                onClick={onOpen}
                disabled={loading}
                w={
                  coachVideoFile || confirmedSelectedThumbnail !== ""
                    ? "80%"
                    : ""
                }
                ml="5"
              >
                Select Video from our Library
              </Button>
            )}

            {coachVideoFile && (
              <Text color={"gray.700"} mt="2">
                Currently Selected: {coachVideoFile["name"]}
              </Text>
            )}
            {confirmedSelectedThumbnail !== "" && (
              <Text color={"gray.700"} mt="2">
                Currently Selected: {confirmedSelectedThumbnail}
              </Text>
            )}
            <input
              type="file"
              id="coach-video"
              ref={coachVideoFileRef}
              style={{ display: "none" }}
              onChange={handleChangeVideo}
            />
            {/* <p>{coachVideoFile}</p> */}

            <Text color={"gray.500"} mt="5">
              Upload a video of the dance that you are trying to learn. For
              example, this could be a video of your teacher, or simply any
              dance video online. Please make sure you only upload the clip you
              are trying to practice.
            </Text>
          </Box>
        </Box>
      </Flex>
      <Modal onClose={onClose} size={"6xl"} isOpen={isOpen}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select video from our library</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={4} spacing={10}>
              {libraryData.map((item, index) => (
                <Tooltip label="Click to choose this dance" key={index}>
                  <Box
                    bg={"white"}
                    borderWidth={
                      selectedThumbnail === item.fileName ? "2px" : "1px"
                    }
                    borderColor={
                      selectedThumbnail === item.fileName ? "teal" : ""
                    }
                    rounded="lg"
                    shadow="sm"
                    position="relative"
                    _hover={{
                      bg: "gray.50",
                      cursor: "pointer",
                      shadow: "lg",
                    }}
                    onClick={() => handleClickThumbnail(item.fileName)}
                  >
                    <Image
                      src={item.imageURL}
                      alt={`Picture of ${item.name}`}
                      roundedTop="lg"
                      height="85%"
                    />

                    <Box p="6">
                      <Center>
                        <Flex
                          mt="1"
                          justifyContent="space-between"
                          alignContent="center"
                        >
                          <Box
                            fontSize="md"
                            fontWeight="normal"
                            as="h4"
                            lineHeight="tight"
                            isTruncated
                          >
                            {item.name}
                          </Box>
                        </Flex>
                      </Center>
                    </Box>
                  </Box>
                </Tooltip>
              ))}
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button
              mr="5"
              colorScheme="blue"
              onClick={() => confirmThumbnail()}
              disabled={selectedThumbnail === ""}
            >
              Confirm
            </Button>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );

  const gridRef = useRef(null);

  const content2 = (
    <>
      <Flex py={4} height="70vh" width="full">
        <Box
          direction="row"
          display="flex"
          width="100%"
          justifyContent="center"
        >
          <Box
            width="full"
            height="full"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            textAlign="center"
          >
            <Box
              width="auto"
              height="100%"
              maxHeight="100%"
              maxWidth="50%"
              display="flex"
              justifyContent="center"
              alignItems="center"
              textAlign="center"
            >
              <MediaPipe
                gridRef={gridRef}
                setLoaded={setMediaPipeLoaded}
                webcamRef={recordWebcam.webcamRef}
                expectedAnnotations={coachAnnotations}
                expectedDuration={coachVideoLength}
                setAccuracy={setAccuracy}
              />
            </Box>
            <Center width="100%" mt="-10">
              {!showTimer && (
                <Button
                  leftIcon={buttonColor !== "red" ? <FaVideo /> : ""}
                  disabled={buttonColor === "red" || !mediaPipeLoaded}
                  colorScheme={buttonColor}
                  variant="solid"
                  size="lg"
                  onClick={startRecording}
                  isLoading={loading || !mediaPipeLoaded}
                  loadingText={!mediaPipeLoaded ? "Loading" : "Processing"}
                  // spinner={<BeatLoader size={8} color="white" />}
                >
                  {buttonText}
                </Button>
              )}
              {showTimer && (
                <Text
                  className="timer-wrapper"
                  style={{ fontFamily: "Roboto" }}
                >
                  <CountdownCircleTimer
                    style={{ fontFamily: "Roboto" }}
                    isPlaying
                    duration={Math.round(coachVideoLength)}
                    colors={[["#004777", 0.33], ["#FF0080", 0.33], ["#7928CA"]]}
                    onComplete={() => [true, 1000]}
                  >
                    {renderTime}
                  </CountdownCircleTimer>
                </Text>
              )}
            </Center>
            {/* {showTimer && (
              <Center>
                <Heading fontSize={"2xl"} fontFamily={"body"} mr={1}>
                  Current Accuracy:
                </Heading>
                <Heading fontSize={"2xl"} fontFamily={"body"} color="green">
                  {(Math.round(10 * accuracy) / 10).toFixed(1)}%
                </Heading>
              </Center>
            )} */}
          </Box>

          <Flex ml="20" display="flex" direction="column" alignItems="center">
            <Center width="100%">
              <Text color={"gray.500"} mt="2" mb="3" textAlign="center">
                Record yourself practicing the dance! Tango will provide you
                with live feedback based on the video you uploaded earlier.
              </Text>
              {/* {curLandmarks.map((val, i) => <p key={i}>{val['x']} {val['y']} {val['z']} {val['visibility']}</p>)} */}
            </Center>
            {(coachVideoFile || coachFileId) && (
              <video
                style={{
                  transform: "rotateY(180deg)",
                  "-webkit-transform": "rotateY(180deg)",
                  "-moz-transform": "rotateY(180deg)",
                }}
                id="coachFilePlaying"
                src={
                  confirmedSelectedThumbnail !== ""
                    ? `http://127.0.0.1:8000/getexisting?fileid=${confirmedSelectedThumbnail}`
                    : `http://127.0.0.1:8000/getvideo?fileid=${coachFileId}`
                }
                // controls
              />
            )}
            {/* <Center width="100%" mb={3}>
            {!showTimer && (
              <Button
                leftIcon={buttonColor !== "red" ? <FaVideo /> : ""}
                disabled={buttonColor === "red"}
                colorScheme={buttonColor}
                variant="solid"
                size="lg"
                onClick={startRecording}
                mt="3"
                mb="3"
                isLoading={loading || !mediaPipeLoaded}
                loadingText={!mediaPipeLoaded ? "Loading" : "Processing"}
                // spinner={<BeatLoader size={8} color="white" />}
              >
                {buttonText}
              </Button>
            )}
            {showTimer && (
              <Text className="timer-wrapper" style={{ fontFamily: "Roboto" }}>
                <CountdownCircleTimer
                  style={{ fontFamily: "Roboto" }}
                  isPlaying
                  duration={Math.round(coachVideoLength)}
                  colors={[["#004777", 0.33], ["#FF0080", 0.33], ["#7928CA"]]}
                  onComplete={() => [true, 1000]}
                >
                  {renderTime}
                </CountdownCircleTimer>
              </Text>
            )}
          </Center> */}

            <Box width="100%" height="100%">
              <LandmarkGrid gridRef={gridRef} />
            </Box>
          </Flex>
        </Box>
      </Flex>
      <Modal size={"xl"} isOpen={usernameModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Enter Username</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder="Username"
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              mr="5"
              colorScheme="blue"
              disabled={username === ""}
              onClick={() => {
                setUsernameModal(false);
                uploadRecording();
              }}
            >
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );

  const content3 = (
    <>
      <Center py={2} mt="5">
        <Box
          w={"full"}
          bg={useColorModeValue("white", "gray.900")}
          boxShadow={"2xl"}
          rounded={"lg"}
          p={6}
          textAlign={"center"}
          justifyContent={"center"}
        >
          <Box display="flex" direction="row" justifyContent="center">
            <Heading fontSize={"2xl"} fontFamily={"body"} mr={1}>
              Total Accuracy:
            </Heading>
            <Heading fontSize={"2xl"} fontFamily={"body"} color="green">
              {(Math.round(10 * finalResults["overall_score"]) / 10).toFixed(1)}
              %
            </Heading>
          </Box>

          <Text
            textAlign={"center"}
            color={"blue.600"}
            fontWeight="medium"
            px={3}
            mt="2"
          >
            {/* Running Feedback for Dance goes here: Open your elbows more! */}
          </Text>
          <Text color={"gray.500"} mt="2" textAlign="center">
            Thank you for trying out Tango! Check out our final accuracy
            analysis of your dance.
          </Text>

          {/* <Button
            leftIcon={<AiOutlineCheckCircle />}
            color="white"
            bgColor="teal.500"
            variant="solid"
            size="lg"
            mt="5"
            >
              Reset
          </Button> */}
        </Box>
      </Center>

      <Box
        width="full"
        // maxHeight="100%"
        direction="row"
        display="flex"
        justifyContent="center"
        alignItems="center"
        textAlign="center"
      >
        <Box width="50%" display="flex" direction="row" justifyContent="center">
          <video
            ref={finalVideoRef}
            controls
            src={`http://127.0.0.1:8000/getvideo?fileid=${finalResults["fileid"]}`}
          />
        </Box>

        <Box width="50%" mt="5">
          <Text
            textAlign={"center"}
            color={"teal.500"}
            fontWeight="medium"
            fontSize="larger"
          >
            Accuracy over time
          </Text>
          <AreaChart
            width={600}
            height={350}
            data={
              finalResults &&
              finalResults["frames"] &&
              finalResults["frames"].map((x, i, arr) => {
                function label(ind) {
                  return coachVideoLength * (ind / arr.length);
                }

                return {
                  name:
                    i === 0 || Math.floor(label(i)) !== Math.floor(label(i - 1))
                      ? Math.round(label(i))
                      : -1,
                  overall: x,
                };
              })
            }
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <Area type="monotone" dataKey="overall" stroke="#8884d8" />
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            {coachVideoLength > 0 && (
              <XAxis
                dataKey="name"
                label={{ value: "seconds", position: "bottom", offset: -7 }}
                ticks={[...Array(Math.ceil(coachVideoLength)).keys()]}
              />
            )}
            <YAxis domain={[0, 100]} />
            {/* {finalVideoRef.current && finalResults["frames"] && (
              <ReferenceDot
                x={Math.round(
                  (finalVideoRef.current.currentTime /
                    finalVideoRef.current.duration) *
                    finalResults["frames"].length
                )}
                y={50}
                r={5}
                fill="red"
                stroke="none"
              />
            )} */}
            <chartTooltip />
          </AreaChart>
        </Box>
      </Box>

      <Box width="full" pt={4}>
        <SimpleGrid columns={2} spacing={10}>
          <Box>
            <SimpleGrid columns={4} spacing={10}>
              <Box textAlign="center">
                <Text fontSize="22" fontWeight="bold">
                  Left Hand
                </Text>
                <PieChart
                  data={[
                    {
                      value: (
                        Math.round(10 * finalResults["left_hand_overall"]) / 10
                      ).toFixed(1),
                      color: "#3182CE",
                    },
                    {
                      value:
                        100 -
                        (
                          Math.round(10 * finalResults["left_hand_overall"]) /
                          10
                        ).toFixed(1),
                      color: "#efefef",
                    },
                  ]}
                  totalValue={100}
                  lineWidth={20}
                  label={({ dataEntry, index }) =>
                    dataEntry.value ===
                    (
                      Math.round(10 * finalResults["left_hand_overall"]) / 10
                    ).toFixed(1)
                      ? dataEntry.value + "%"
                      : ""
                  }
                  labelStyle={{
                    fontSize: "25px",
                    fontFamily: "sans-serif",
                    fill: "#3182CE",
                  }}
                  labelPosition={0}
                />
              </Box>
              <Box textAlign="center">
                <Text fontSize="22" fontWeight="bold">
                  Right Hand
                </Text>
                <PieChart
                  data={[
                    {
                      value: (
                        Math.round(10 * finalResults["right_hand_overall"]) / 10
                      ).toFixed(1),
                      color: "#38A169",
                    },
                    {
                      value:
                        100 -
                        (
                          Math.round(10 * finalResults["right_hand_overall"]) /
                          10
                        ).toFixed(1),
                      color: "#efefef",
                    },
                  ]}
                  totalValue={100}
                  lineWidth={20}
                  label={({ dataEntry, index }) =>
                    dataEntry.value ===
                    (
                      Math.round(10 * finalResults["right_hand_overall"]) / 10
                    ).toFixed(1)
                      ? dataEntry.value + "%"
                      : ""
                  }
                  labelStyle={{
                    fontSize: "25px",
                    fontFamily: "sans-serif",
                    fill: "#38A169",
                  }}
                  labelPosition={0}
                />
              </Box>
              <Box textAlign="center">
                <Text fontSize="22" fontWeight="bold">
                  Left Leg
                </Text>
                <PieChart
                  data={[
                    {
                      value: (
                        Math.round(10 * finalResults["left_leg_overall"]) / 10
                      ).toFixed(1),
                      color: "#DD6B20",
                    },
                    {
                      value:
                        100 -
                        (
                          Math.round(10 * finalResults["left_leg_overall"]) / 10
                        ).toFixed(1),
                      color: "#efefef",
                    },
                  ]}
                  totalValue={100}
                  lineWidth={20}
                  label={({ dataEntry, index }) =>
                    dataEntry.value ===
                    (
                      Math.round(10 * finalResults["left_leg_overall"]) / 10
                    ).toFixed(1)
                      ? dataEntry.value + "%"
                      : ""
                  }
                  labelStyle={{
                    fontSize: "25px",
                    fontFamily: "sans-serif",
                    fill: "#DD6B20",
                  }}
                  labelPosition={0}
                />
              </Box>
              <Box textAlign="center">
                <Text fontSize="22" fontWeight="bold">
                  Right Leg
                </Text>
                <PieChart
                  data={[
                    {
                      value: (
                        Math.round(10 * finalResults["right_leg_overall"]) / 10
                      ).toFixed(1),
                      color: "#E53E3E",
                    },
                    {
                      value:
                        100 -
                        (
                          Math.round(10 * finalResults["right_leg_overall"]) /
                          10
                        ).toFixed(1),
                      color: "#efefef",
                    },
                  ]}
                  totalValue={100}
                  lineWidth={20}
                  label={({ dataEntry, index }) =>
                    dataEntry.value ===
                    (
                      Math.round(10 * finalResults["right_leg_overall"]) / 10
                    ).toFixed(1)
                      ? dataEntry.value + "%"
                      : ""
                  }
                  labelStyle={{
                    fontSize: "25px",
                    fontFamily: "sans-serif",
                    fill: "#E53E3E",
                  }}
                  labelPosition={0}
                />
              </Box>
            </SimpleGrid>
            <Box mt="10">
              <LineChart
                width={600}
                height={350}
                data={
                  finalResults &&
                  finalResults["frames"] &&
                  finalResults["frames"]
                    .filter((x, i, arr) => i % 10 === 0)
                    .map((x, i, arr) => {
                      function label(ind) {
                        return coachVideoLength * (ind / arr.length);
                      }

                      const scale = 10;

                      return {
                        name:
                          i === 0 ||
                          Math.floor(label(i)) !== Math.floor(label(i - 1))
                            ? Math.round(label(i))
                            : -1,
                        overall: x,
                        leftHand: finalResults["left_hand"][scale * i],
                        rightHand: finalResults["right_hand"][scale * i],
                        leftLeg: finalResults["left_leg"][scale * i],
                        rightLeg: finalResults["right_leg"][scale * i],
                      };
                    })
                }
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                {/* <Line type="monotone" dataKey="overall" stroke="#000000" /> */}
                <Line type="monotone" dataKey="leftHand" stroke="#3182CE" />
                <Line type="monotone" dataKey="rightHand" stroke="#38A169" />
                <Line type="monotone" dataKey="leftLeg" stroke="#DD6B20" />
                <Line type="monotone" dataKey="rightLeg" stroke="#E53E3E" />
                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                {/* {coachVideoLength > 0 && (
              <XAxis
                dataKey="name"
                label={{ value: "seconds", position: "bottom", offset: -7 }}
                ticks={[...Array(Math.ceil(coachVideoLength)).keys()]}
              />
            )} */}
                <YAxis domain={[0, 100]} />
                {/* {finalVideoRef.current && finalResults["frames"] && (
              <ReferenceDot
                x={Math.round(
                  (finalVideoRef.current.currentTime /
                    finalVideoRef.current.duration) *
                    finalResults["frames"].length
                )}
                y={50}
                r={5}
                fill="red"
                stroke="none"
              />
            )} */}
                <chartTooltip />
              </LineChart>
            </Box>
          </Box>
          {confirmedSelectedThumbnail && (
            <Box textAlign="center">
              <Heading fontSize={"2xl"} fontFamily={"body"} mb={2}>
                Global Leaderboard
              </Heading>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Rank</Th>
                    <Th>Score</Th>
                    <Th>Name</Th>
                    {/* <Th isNumeric>multiply by</Th> */}
                  </Tr>
                </Thead>
                <Tbody>
                  {leaderboardData.data.map((item, index) => (
                    <Tr bg={leaderboardData.rank === item[0] ? "gold" : ""}>
                      <Td>{item[0]}</Td>
                      <Td>{item[3]}%</Td>
                      <Td>{item[1]}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </SimpleGrid>
      </Box>

      <br />
      <Button
        mt={6}
        colorScheme="teal"
        size="sm"
        onClick={() => window.location.reload()}
      >
        Restart
      </Button>
      <br />
      <br />
      <br />
      <br />
    </>
  );

  const steps = [
    {
      label: "Upload Dance Video",
      content: uploaddancevideo,
      requiresCompletion: false,
    },
    {
      label: "Record Your Dance",
      content: content2,
      requiresCompletion: false,
    },
    { label: "View Results!", content: content3, requiresCompletion: false },
  ];

  const [stepCompleted, setStepCompleted] = useState(
    new Array(steps.length).fill(false)
  );

  return (
    <>
      <Navbar />
      <Center mt="5">
        <VStack width="80%">
          <Steps
            state={loading ? "loading" : ""}
            colorScheme="teal"
            activeStep={activeStep}
          >
            {steps.map(({ label, content }) => (
              <Step label={label} key={label}>
                {content}
              </Step>
            ))}
          </Steps>
          {activeStep === 2 ? (
            ""
          ) : (
            <>
              <StepButtons
                {...{ nextStep, prevStep }}
                prevDisabled={activeStep === 0}
                nextDisabled={
                  steps[activeStep].requiresCompletion &&
                  !stepCompleted[activeStep]
                }
                style={{ display: "none" }}
              />
            </>
          )}
        </VStack>
      </Center>
    </>
  );
}
