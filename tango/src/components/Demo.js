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
} from "@chakra-ui/react";

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

  const [buttonText, setButtonText] = useState("Start Recording");
  const [buttonColor, setButtonColor] = useState("teal");
  const [selectedThumbnail, setSelectedThumbnail] = useState("");
  const [confirmedSelectedThumbnail, setConfirmedSelectedThumbnail] =
    useState("");
  const [coachPlaying, setCoachPlaying] = useState(false);

  const coachVideoFileRef = useRef(null);
  const [coachVideoFile, setCoachVideoFile] = useState(null);
  const coachVideoRef = useRef(null);
  const [coachVideoLength, setCoachVideoLength] = useState(0);

  const [coachFileId, setCoachFileId] = useState("");

  const [coachAnnotations, setCoachAnnotations] = useState([]);
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
    setLoading(true);

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
            uploadRecording();
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
    </>
  );

  const content2 = <Flex py={4} height="70vh" width="full"></Flex>;

  const lineChartData = [
    { name: "Page A", uv: 400, pv: 2400, amt: 2400 },
    { name: "Page B", uv: 300, pv: 2400, amt: 2400 },
    { name: "Page C", uv: 250, pv: 2400, amt: 2400 },
    { name: "Page D", uv: 200, pv: 2400, amt: 2400 },
  ];

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
                  uv: x,
                };
              })
            }
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <Area type="monotone" dataKey="uv" stroke="#8884d8" />
            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
            {coachVideoLength > 0 && (
              <XAxis
                dataKey="name"
                label={{ value: "seconds", position: "bottom", offset: -7 }}
                ticks={[...Array(Math.ceil(coachVideoLength)).keys()]}
              />
            )}
            <YAxis domain={[0, 100]} />
            {finalVideoRef.current && finalResults["frames"] && (
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
            )}
            <chartTooltip />
          </AreaChart>
        </Box>
      </Box>
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
            <ResetPrompt onReset={reset} />
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
