from fastapi import FastAPI, File, UploadFile, Form, Request
import cv2
import uuid
import uvicorn
import mediapipe
import math
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw
import numpy as np
import os
import drawing_utils as mp_drawing
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import ffmpeg
import time
import sqlite3

poseModule = mediapipe.solutions.pose
mp_drawing_styles = mediapipe.solutions.drawing_styles

pose = poseModule.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5, model_complexity=0) # , model_complexity={0,1,2} (fastest to slowest)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
def calculateAngle(a, b, c):
    x1 = a.x
    y1 = a.y
    x2 = b.x
    y2 = b.y
    x3 = c.x
    y3 = c.y
    angle = math.degrees(math.atan2(y3 - y2, x3 - x2) - math.atan2(y1 - y2, x1 - x2))
    if angle < 0:
        angle += 360

    return angle

def computePoint(x1, y1, x2, y2, theta, k):
    dx = x1 - x2
    dy = y1 - y2
    theta = math.radians(theta)
    rdx = dx * math.cos(theta) - dy * math.sin(theta)
    rdy = dx * math.sin(theta) + dy * math.cos(theta)
    ab = math.sqrt(dx*dx + dy*dy)
    return (k/ab * rdx + x2, k/ab *rdy + y2)


def get_data(results_pose):
    LEFT_SHOULDER = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_SHOULDER]
    RIGHT_SHOULDER = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_SHOULDER]
    LEFT_ELBOW = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ELBOW]
    RIGHT_ELBOW = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ELBOW]
    LEFT_WRIST = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_WRIST]
    RIGHT_WRIST = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_WRIST]

    LEFT_HIP = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_HIP]
    RIGHT_HIP = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_HIP]
    LEFT_KNEE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_KNEE]
    RIGHT_KNEE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_KNEE]
    LEFT_ANKLE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ANKLE]
    RIGHT_ANKLE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ANKLE]

    angles_data = [
        calculateAngle(RIGHT_SHOULDER, LEFT_SHOULDER, LEFT_ELBOW),
        calculateAngle(LEFT_SHOULDER, LEFT_ELBOW, LEFT_WRIST),
        calculateAngle(LEFT_SHOULDER, RIGHT_SHOULDER, RIGHT_ELBOW),
        calculateAngle(RIGHT_SHOULDER, RIGHT_ELBOW, RIGHT_WRIST),
        calculateAngle(RIGHT_HIP, LEFT_HIP, LEFT_KNEE),
        calculateAngle(LEFT_HIP, LEFT_KNEE, LEFT_ANKLE),
        calculateAngle(LEFT_HIP, RIGHT_HIP, RIGHT_KNEE),
        calculateAngle(RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE)
    ]

    return angles_data

def calculate_distance(a, b):
    return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

def interpolate(pose1, pose2):
    angles_data = get_data(pose1)
    LEFT_SHOULDER = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_SHOULDER]
    RIGHT_SHOULDER = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_SHOULDER]
    LEFT_ELBOW = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ELBOW]
    RIGHT_ELBOW = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ELBOW]
    LEFT_WRIST = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_WRIST]
    RIGHT_WRIST = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_WRIST]

    LEFT_HIP = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_HIP]
    RIGHT_HIP = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_HIP]
    LEFT_KNEE = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_KNEE]
    RIGHT_KNEE = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_KNEE]
    LEFT_ANKLE = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ANKLE]
    RIGHT_ANKLE = pose2.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ANKLE]

    LEFT_SHOULDER1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_SHOULDER]
    RIGHT_SHOULDER1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_SHOULDER]
    LEFT_ELBOW1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ELBOW]
    RIGHT_ELBOW1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ELBOW]
    LEFT_WRIST1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_WRIST]
    RIGHT_WRIST1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_WRIST]

    LEFT_HIP1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_HIP]
    RIGHT_HIP1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_HIP]
    LEFT_KNEE1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_KNEE]
    RIGHT_KNEE1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_KNEE]
    LEFT_ANKLE1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ANKLE]
    RIGHT_ANKLE1 = pose1.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ANKLE]

    scaling_factor = calculate_distance(LEFT_SHOULDER, RIGHT_SHOULDER)/calculate_distance(LEFT_SHOULDER1, RIGHT_SHOULDER1)
    angle = angles_data[0]
    dist = calculate_distance(LEFT_SHOULDER1, LEFT_ELBOW1) * scaling_factor
    x_coord, y_coord = computePoint(RIGHT_SHOULDER.x, RIGHT_SHOULDER.y, LEFT_SHOULDER.x, LEFT_SHOULDER.y, angle, dist)

    LEFT_ELBOW.x = x_coord
    LEFT_ELBOW.y = y_coord

    angle = angles_data[1]
    dist = calculate_distance(LEFT_ELBOW1, LEFT_WRIST1) * scaling_factor
    x_coord, y_coord = computePoint(LEFT_SHOULDER.x, LEFT_SHOULDER.y, LEFT_ELBOW.x, LEFT_ELBOW.y, angle, dist)

    LEFT_WRIST.x = x_coord
    LEFT_WRIST.y = y_coord

    angle = angles_data[2]
    dist = calculate_distance(RIGHT_SHOULDER1, RIGHT_ELBOW1) * scaling_factor
    x_coord, y_coord = computePoint(LEFT_SHOULDER.x, LEFT_SHOULDER.y, RIGHT_SHOULDER.x, RIGHT_SHOULDER.y, angle, dist)

    RIGHT_ELBOW.x = x_coord
    RIGHT_ELBOW.y = y_coord

    angle = angles_data[3]
    dist = calculate_distance(RIGHT_ELBOW1, RIGHT_WRIST1) * scaling_factor
    x_coord, y_coord = computePoint(RIGHT_SHOULDER.x, RIGHT_SHOULDER.y, RIGHT_ELBOW.x, RIGHT_ELBOW.y, angle, dist)

    RIGHT_WRIST.x = x_coord
    RIGHT_WRIST.y = y_coord

    angle = angles_data[4]
    dist = calculate_distance(LEFT_HIP1, LEFT_KNEE1) * scaling_factor
    x_coord, y_coord = computePoint(RIGHT_HIP.x, RIGHT_HIP.y, LEFT_HIP.x, LEFT_HIP.y, angle, dist)

    LEFT_KNEE.x = x_coord
    LEFT_KNEE.y = y_coord

    angle = angles_data[5]
    dist = calculate_distance(LEFT_KNEE1, LEFT_ANKLE1) * scaling_factor
    x_coord, y_coord = computePoint(LEFT_HIP.x, LEFT_HIP.y, LEFT_KNEE.x, LEFT_KNEE.y, angle, dist)

    LEFT_ANKLE.x = x_coord
    LEFT_ANKLE.y = y_coord

    angle = angles_data[6]
    dist = calculate_distance(RIGHT_HIP1, RIGHT_KNEE1)* scaling_factor
    x_coord, y_coord = computePoint(LEFT_HIP.x, LEFT_HIP.y, RIGHT_HIP.x, RIGHT_HIP.y, angle, dist)

    RIGHT_KNEE.x = x_coord
    RIGHT_KNEE.y = y_coord

    angle = angles_data[7]
    dist = calculate_distance(RIGHT_KNEE1, RIGHT_ANKLE1)* scaling_factor
    x_coord, y_coord = computePoint(RIGHT_HIP.x, RIGHT_HIP.y, RIGHT_KNEE.x, RIGHT_KNEE.y, angle, dist)

    RIGHT_ANKLE.x = x_coord
    RIGHT_ANKLE.y = y_coord

    return {
        "LEFT_SHOULDER": LEFT_SHOULDER,
        "RIGHT_SHOULDER": RIGHT_SHOULDER,
        "LEFT_ELBOW": LEFT_ELBOW,
        "RIGHT_ELBOW": RIGHT_ELBOW,
        "LEFT_WRIST": LEFT_WRIST,
        "RIGHT_WRIST": RIGHT_WRIST,
        "LEFT_HIP": LEFT_HIP,
        "RIGHT_HIP": RIGHT_HIP,
        "LEFT_KNEE": LEFT_KNEE,
        "RIGHT_KNEE": RIGHT_KNEE,
        "LEFT_ANKLE": LEFT_ANKLE,
        "RIGHT_ANKLE": RIGHT_ANKLE
    }

def segmented_dtw(a, b):
    final = []
    size = 30

    half_size = int(size/2)
    for i in range(half_size, len(a) - half_size):
        distance, path = fastdtw(a[i - half_size:i + half_size], b[i - half_size: i + half_size])
        final.append(distance)

    final = [final[0]] * half_size + final + [final[-1]] * half_size

    return np.array(final[0:len(a)])

def process_angle(k):
    if k > 180:
        return 360 - k
    else:
        return k

def get_point(a, height, width):
    return (round(a.x * width), round(a.y * height))

@app.post("/coachvideo")
async def coachvideo(file: UploadFile = File(...)):
    try:
        contents = file.file.read()
        
        pose_arr = []

        fileid = str(uuid.uuid1())
        with open("videos/" + fileid + "_audio.mp4", "wb") as binary_file:
            binary_file.write(contents)

        capture = cv2.VideoCapture("videos/" + fileid + '_audio.mp4')
        # frameWidth = int(capture.get(3))
        # frameHeight = int(capture.get(4))
        def get_javascript(k):
            # return {"x": k.x * frameWidth, "y": k.y * frameHeight}
            return {"x": k.x, "y": k.y, "z": k.z, "visibility": k.visibility }

        while(capture.isOpened()):
            ret, frame = capture.read()
            if ret:
                final_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results_pose = pose.process(final_frame)
                LEFT_SHOULDER = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_SHOULDER]
                RIGHT_SHOULDER = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_SHOULDER]
                LEFT_ELBOW = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ELBOW]
                RIGHT_ELBOW = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ELBOW]
                LEFT_WRIST = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_WRIST]
                RIGHT_WRIST = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_WRIST]

                LEFT_HIP = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_HIP]
                RIGHT_HIP = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_HIP]
                LEFT_KNEE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_KNEE]
                RIGHT_KNEE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_KNEE]
                LEFT_ANKLE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ANKLE]
                RIGHT_ANKLE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ANKLE]

                final = {
                    "LEFT_SHOULDER": get_javascript(LEFT_SHOULDER),
                    "RIGHT_SHOULDER": get_javascript(RIGHT_SHOULDER),
                    "LEFT_ELBOW": get_javascript(LEFT_ELBOW),
                    "RIGHT_ELBOW": get_javascript(RIGHT_ELBOW),
                    "LEFT_WRIST": get_javascript(LEFT_WRIST),
                    "RIGHT_WRIST": get_javascript(RIGHT_WRIST),
                    "LEFT_HIP": get_javascript(LEFT_HIP),
                    "RIGHT_HIP": get_javascript(RIGHT_HIP),
                    "LEFT_KNEE": get_javascript(LEFT_KNEE),
                    "RIGHT_KNEE": get_javascript(RIGHT_KNEE),
                    "LEFT_ANKLE": get_javascript(LEFT_ANKLE),
                    "RIGHT_ANKLE": get_javascript(RIGHT_ANKLE)
                }
                pose_arr.append(final)
                
            else:
                break

        capture.release()

        return {"status": "success", "data": pose_arr, "fileid": fileid}

    except Exception as e:
        print(e)
        return {"status": "failed"}

@app.post("/coachvideo1")
async def coachvideo1(file: str = Form(...)):
    try:
        contents = open(file, "rb").read()
        
        pose_arr = []

        fileid = str(uuid.uuid1())
        with open("videos/" + fileid + "_audio.mp4", "wb") as binary_file:
            binary_file.write(contents)

        capture = cv2.VideoCapture("videos/" + fileid + '_audio.mp4')
        # frameWidth = int(capture.get(3))
        # frameHeight = int(capture.get(4))
        def get_javascript(k):
            # return {"x": k.x * frameWidth, "y": k.y * frameHeight}
            return {"x": k.x, "y": k.y, "z": k.z, "visibility": k.visibility }

        while(capture.isOpened()):
            ret, frame = capture.read()
            if ret:
                final_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results_pose = pose.process(final_frame)
                LEFT_SHOULDER = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_SHOULDER]
                RIGHT_SHOULDER = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_SHOULDER]
                LEFT_ELBOW = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ELBOW]
                RIGHT_ELBOW = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ELBOW]
                LEFT_WRIST = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_WRIST]
                RIGHT_WRIST = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_WRIST]

                LEFT_HIP = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_HIP]
                RIGHT_HIP = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_HIP]
                LEFT_KNEE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_KNEE]
                RIGHT_KNEE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_KNEE]
                LEFT_ANKLE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.LEFT_ANKLE]
                RIGHT_ANKLE = results_pose.pose_landmarks.landmark[poseModule.PoseLandmark.RIGHT_ANKLE]

                final = {
                    "LEFT_SHOULDER": get_javascript(LEFT_SHOULDER),
                    "RIGHT_SHOULDER": get_javascript(RIGHT_SHOULDER),
                    "LEFT_ELBOW": get_javascript(LEFT_ELBOW),
                    "RIGHT_ELBOW": get_javascript(RIGHT_ELBOW),
                    "LEFT_WRIST": get_javascript(LEFT_WRIST),
                    "RIGHT_WRIST": get_javascript(RIGHT_WRIST),
                    "LEFT_HIP": get_javascript(LEFT_HIP),
                    "RIGHT_HIP": get_javascript(RIGHT_HIP),
                    "LEFT_KNEE": get_javascript(LEFT_KNEE),
                    "RIGHT_KNEE": get_javascript(RIGHT_KNEE),
                    "LEFT_ANKLE": get_javascript(LEFT_ANKLE),
                    "RIGHT_ANKLE": get_javascript(RIGHT_ANKLE)
                }
                pose_arr.append(final)
                
            else:
                break

        capture.release()

        return {"status": "success", "data": pose_arr, "fileid": fileid}

    except Exception as e:
        print(e)
        return {"status": "failed"}

@app.post("/get_leaderboard")
async def get_leaderboard(request: Request):
    data = await request.form()
    print(data)

    try:
        conn = sqlite3.connect('main.db')
        query = f'SELECT * from leaderboard where video_name="{data["video_name"]}"'
        score = float(data["score"])

        cursor = conn.execute(query)

        final = []

        
        for row in cursor:
            final.append(row)

        final = sorted(final, key=lambda x: x[2], reverse=True)

        final1 = []

        r = 1
        for j in final:
            final1.append([r] + list(j))
            r += 1

        final = final1.copy()
        rank = 0

        for i in final:
            if i[3] < score:
                break
            else:
                rank += 1

        if rank > 5:
            final = final[0:4]
            final.append([rank, data["username"], data["video_name"], data["score"]])
        else:
            final = final[0: 5]

        conn.close()
        return {"status": "success", "data": final, "rank": rank}
    except Exception as e:
        print(e)
        return {"status": "failed"}

@app.post("/update_leaderboard")
async def update_leaderboard(request: Request):
    data = await request.form()
    print(data)

    try:
        conn = sqlite3.connect('main.db')
        conn.execute(f'INSERT INTO leaderboard (username, video_name, score) VALUES ("{data["username"]}", "{data["video_name"]}", {data["score"]})')
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        print(e)
        return {"status": "failed"}

@app.post("/uploadfile")
async def create_upload_file(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    try:
        
        start_time =  time.time()

        prev_time = time.time()

        
        contents1 = file1.file.read()
        contents2 = file2.file.read()

        pose_arr_1 = []
        pose_arr_2 = []

        raw_pose_arr_1 = []

        raw_pose_arr_2 = []

        fileid = str(uuid.uuid1())
        with open("videos/" + fileid + "_1.mp4", "wb") as binary_file:
            binary_file.write(contents1)

        with open("videos/" + fileid + "_2.mp4", "wb") as binary_file:
            binary_file.write(contents2)

        capture1 = cv2.VideoCapture("videos/" + fileid + '_1.mp4')

        cur_time = time.time()
        print(cur_time - prev_time)
        prev_time = cur_time

        
        while(capture1.isOpened()):
            ret, frame = capture1.read()
            if ret:
                final_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results_pose = pose.process(final_frame)

                pose_arr_1.append(get_data(results_pose))
                raw_pose_arr_1.append(results_pose)
            else:
                break

        capture1.release()
        capture2 = cv2.VideoCapture("videos/" + fileid + '_2.mp4')
        

        while(capture2.isOpened()):
            ret, frame = capture2.read()

            if ret:
                final_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results_pose = pose.process(final_frame)

                pose_arr_2.append(get_data(results_pose))
                raw_pose_arr_2.append(results_pose)
            else:
                break

        capture2.release()
        
        cur_time = time.time()
        prev_time = cur_time

        final = np.array([0] * len(pose_arr_1))

        ff = 0

        left_hand = np.array([0] * len(pose_arr_1))
        left_hand_overall = 0

        left_leg = np.array([0] * len(pose_arr_1))
        left_leg_overall = 0

        right_hand = np.array([0] * len(pose_arr_1))
        right_hand_overall = 0

        right_leg = np.array([0] * len(pose_arr_1))
        right_leg_overall = 0

        for i in range(8):
            a = [process_angle(j[i]) for j in pose_arr_1]
            b = [process_angle(k[i]) for k in pose_arr_2]

            current = segmented_dtw(a, b)
            ff_a, ff_b = fastdtw(a, b)

            if i == 0 or i == 1:
                left_hand = np.add(left_hand, current)
                left_hand_overall += ff_a

            elif i == 2 or i == 3:
                right_hand = np.add(right_hand, current)
                right_hand_overall += ff_a

            elif i == 4 or i == 5:
                left_leg = np.add(left_leg, current)
                left_leg_overall += ff_a

            elif i == 6 or i == 7:
                right_leg = np.add(right_leg, current)
                right_leg_overall += ff_a

            if i < 4:
                final = np.add(final, current * 3)
            else:
                final = np.add(final, current)

            

            if i < 4:
                ff += ff_a * 3
            else:
                ff += ff_a

        ff = ff/16
        ff = (80 * len(pose_arr_1) - ff)/(0.8 * len(pose_arr_1))
        ff = (ff * ff ) / 100

        left_hand_overall = left_hand_overall / 2
        left_hand_overall = (80 * len(pose_arr_1) - left_hand_overall) / (0.8 * len(pose_arr_1))
        left_hand_overall = (left_hand_overall * left_hand_overall) / 100

        right_hand_overall = right_hand_overall / 2
        right_hand_overall = (80 * len(pose_arr_1) - right_hand_overall) / (0.8 * len(pose_arr_1))
        right_hand_overall = (right_hand_overall * right_hand_overall) / 100

        left_leg_overall = left_leg_overall / 2
        left_leg_overall = (80 * len(pose_arr_1) - left_leg_overall) / (0.8 * len(pose_arr_1))
        left_leg_overall = (left_leg_overall * left_leg_overall) / 100

        right_leg_overall = right_leg_overall / 2
        right_leg_overall = (80 * len(pose_arr_1) - right_leg_overall) / (0.8 * len(pose_arr_1))
        right_leg_overall = (right_leg_overall * right_leg_overall) / 100


        final = final/16
        final1 = list(final).copy()
        final = (2400 - final)/24
        final = list((final * final) / 100)

        left_hand = left_hand / 2
        left_hand = (2400 - left_hand)/24
        left_hand = list((left_hand * left_hand) / 100)

        right_hand = right_hand / 2
        right_hand = (2400 - right_hand)/24
        right_hand = list((right_hand * right_hand) / 100)

        left_leg = left_leg / 2
        left_leg = (2400 - left_leg)/24
        left_leg = list((left_leg * left_leg) / 100)

        right_leg = right_leg / 2
        right_leg = (2400 - right_leg)/24
        right_leg = list((right_leg * right_leg) / 100)

        capture3 = cv2.VideoCapture("videos/" + fileid + '_2.mp4')
        frameWidth = int(capture3.get(3))
        frameHeight = int(capture3.get(4))
        frameSize = (frameWidth, frameHeight)
        frameRate = capture3.get(cv2.CAP_PROP_FPS)

        out = cv2.VideoWriter("videos/" + fileid + '_out.mp4',cv2.VideoWriter_fourcc(*'mp4v'), frameRate, frameSize)

        counter = 0
        cur_time = time.time()
        prev_time = cur_time

        while(True):
            ret, frame = capture3.read()
            if ret == True:
                try:
                    results_pose2 = raw_pose_arr_2[counter]
                    results_pose1 = raw_pose_arr_1[counter]
                    mp_drawing.draw_landmarks(True, frame, results_pose2.pose_landmarks, poseModule.POSE_CONNECTIONS, landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())

                    annotations = interpolate(results_pose1, results_pose2)

                    p1 = get_point(annotations["LEFT_SHOULDER"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_ELBOW"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["LEFT_ELBOW"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_WRIST"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_SHOULDER"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_ELBOW"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_ELBOW"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_WRIST"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["LEFT_HIP"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_KNEE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["LEFT_KNEE"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_ANKLE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_HIP"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_KNEE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_KNEE"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_ANKLE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    frame = cv2.putText(frame, str(round(final[counter], 3)) + "%", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 234, 255), 3, cv2.LINE_AA)

                    if counter >= len(pose_arr_1) - 75:
                        frame = cv2.putText(frame, "Overall score: " + str(round(ff, 3)) + "%", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 158, 255), 3, cv2.LINE_AA)

                except Exception as e:
                    
                    break
                out.write(frame)

                counter += 1
            else:
                break  

        capture3.release()
        out.release()
        cur_time = time.time()
        prev_time = cur_time

        i1 = ffmpeg.input(f'videos/{fileid}_1.mp4')
        audio = i1.audio

        
        os.system(f"ffmpeg -i videos/{fileid}_out.mp4 -vcodec libx264 videos/{fileid}_final.mp4")
        

        i2 = ffmpeg.input(f"videos/{fileid}_final.mp4")
        video = i2.video

        out1 = ffmpeg.output(audio, video, f'videos/{fileid}_audio.mp4')
        out1.run()

        os.remove("videos/" + fileid + "_1.mp4")
        os.remove("videos/" + fileid + "_2.mp4")
        os.remove("videos/" + fileid + "_out.mp4")
        os.remove("videos/" + fileid + "_final.mp4")
        return {"status": "success", "fileid": fileid, "overall_score": ff, "frames": final,
        "left_hand": left_hand, "left_hand_overall": left_hand_overall, "left_leg": left_leg, "left_leg_overall": left_leg_overall,
        "right_hand": right_hand, "right_hand_overall": right_hand_overall, "right_leg": right_leg, "right_leg_overall": right_leg_overall}
    except Exception as e:
        print(e)
        return {"status": "failed"}

@app.post("/uploadfile1")
async def create_upload_file1(file1: str = Form(...), file2: UploadFile = File(...)):
    try:
        
        start_time =  time.time()

        prev_time = time.time()

        
        contents1 = open(file1, "rb").read()
        contents2 = file2.file.read()

        pose_arr_1 = []
        pose_arr_2 = []

        raw_pose_arr_1 = []

        raw_pose_arr_2 = []

        fileid = str(uuid.uuid1())
        with open("videos/" + fileid + "_1.mp4", "wb") as binary_file:
            binary_file.write(contents1)

        with open("videos/" + fileid + "_2.mp4", "wb") as binary_file:
            binary_file.write(contents2)

        capture1 = cv2.VideoCapture("videos/" + fileid + '_1.mp4')

        cur_time = time.time()
        print(cur_time - prev_time)
        prev_time = cur_time

        
        while(capture1.isOpened()):
            ret, frame = capture1.read()
            if ret:
                final_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results_pose = pose.process(final_frame)

                pose_arr_1.append(get_data(results_pose))
                raw_pose_arr_1.append(results_pose)
            else:
                break

        capture1.release()
        capture2 = cv2.VideoCapture("videos/" + fileid + '_2.mp4')
        

        while(capture2.isOpened()):
            ret, frame = capture2.read()

            if ret:
                final_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results_pose = pose.process(final_frame)

                pose_arr_2.append(get_data(results_pose))
                raw_pose_arr_2.append(results_pose)
            else:
                break

        capture2.release()
        
        cur_time = time.time()
        prev_time = cur_time

        final = np.array([0] * len(pose_arr_1))

        ff = 0

        left_hand = np.array([0] * len(pose_arr_1))
        left_hand_overall = 0

        left_leg = np.array([0] * len(pose_arr_1))
        left_leg_overall = 0

        right_hand = np.array([0] * len(pose_arr_1))
        right_hand_overall = 0

        right_leg = np.array([0] * len(pose_arr_1))
        right_leg_overall = 0

        for i in range(8):
            a = [process_angle(j[i]) for j in pose_arr_1]
            b = [process_angle(k[i]) for k in pose_arr_2]

            current = segmented_dtw(a, b)
            ff_a, ff_b = fastdtw(a, b)

            if i == 0 or i == 1:
                left_hand = np.add(left_hand, current)
                left_hand_overall += ff_a

            elif i == 2 or i == 3:
                right_hand = np.add(right_hand, current)
                right_hand_overall += ff_a

            elif i == 4 or i == 5:
                left_leg = np.add(left_leg, current)
                left_leg_overall += ff_a

            elif i == 6 or i == 7:
                right_leg = np.add(right_leg, current)
                right_leg_overall += ff_a

            if i < 4:
                final = np.add(final, current * 3)
            else:
                final = np.add(final, current)

            

            if i < 4:
                ff += ff_a * 3
            else:
                ff += ff_a

        ff = ff/16
        ff = (80 * len(pose_arr_1) - ff)/(0.8 * len(pose_arr_1))
        ff = (ff * ff ) / 100

        left_hand_overall = left_hand_overall / 2
        left_hand_overall = (80 * len(pose_arr_1) - left_hand_overall) / (0.8 * len(pose_arr_1))
        left_hand_overall = (left_hand_overall * left_hand_overall) / 100

        right_hand_overall = right_hand_overall / 2
        right_hand_overall = (80 * len(pose_arr_1) - right_hand_overall) / (0.8 * len(pose_arr_1))
        right_hand_overall = (right_hand_overall * right_hand_overall) / 100

        left_leg_overall = left_leg_overall / 2
        left_leg_overall = (80 * len(pose_arr_1) - left_leg_overall) / (0.8 * len(pose_arr_1))
        left_leg_overall = (left_leg_overall * left_leg_overall) / 100

        right_leg_overall = right_leg_overall / 2
        right_leg_overall = (80 * len(pose_arr_1) - right_leg_overall) / (0.8 * len(pose_arr_1))
        right_leg_overall = (right_leg_overall * right_leg_overall) / 100


        final = final/16
        final1 = list(final).copy()
        final = (2400 - final)/24
        final = list((final * final) / 100)

        left_hand = left_hand / 2
        left_hand = (2400 - left_hand)/24
        left_hand = list((left_hand * left_hand) / 100)

        right_hand = right_hand / 2
        right_hand = (2400 - right_hand)/24
        right_hand = list((right_hand * right_hand) / 100)

        left_leg = left_leg / 2
        left_leg = (2400 - left_leg)/24
        left_leg = list((left_leg * left_leg) / 100)

        right_leg = right_leg / 2
        right_leg = (2400 - right_leg)/24
        right_leg = list((right_leg * right_leg) / 100)

        capture3 = cv2.VideoCapture("videos/" + fileid + '_2.mp4')
        frameWidth = int(capture3.get(3))
        frameHeight = int(capture3.get(4))
        frameSize = (frameWidth, frameHeight)
        frameRate = capture3.get(cv2.CAP_PROP_FPS)

        out = cv2.VideoWriter("videos/" + fileid + '_out.mp4',cv2.VideoWriter_fourcc(*'mp4v'), frameRate, frameSize)

        counter = 0
        cur_time = time.time()
        prev_time = cur_time

        while(True):
            ret, frame = capture3.read()
            if ret == True:
                try:
                    results_pose2 = raw_pose_arr_2[counter]
                    results_pose1 = raw_pose_arr_1[counter]
                    mp_drawing.draw_landmarks(True, frame, results_pose2.pose_landmarks, poseModule.POSE_CONNECTIONS, landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())

                    annotations = interpolate(results_pose1, results_pose2)

                    p1 = get_point(annotations["LEFT_SHOULDER"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_ELBOW"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["LEFT_ELBOW"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_WRIST"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_SHOULDER"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_ELBOW"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_ELBOW"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_WRIST"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["LEFT_HIP"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_KNEE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["LEFT_KNEE"], frameHeight, frameWidth)
                    p2 = get_point(annotations["LEFT_ANKLE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_HIP"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_KNEE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    p1 = get_point(annotations["RIGHT_KNEE"], frameHeight, frameWidth)
                    p2 = get_point(annotations["RIGHT_ANKLE"], frameHeight, frameWidth)

                    frame = cv2.line(frame, p1, p2, (228, 56, 255), 6)
                    frame = cv2.circle(frame, p1, 8, (228, 56, 255), 8)
                    frame = cv2.circle(frame, p2, 8, (228, 56, 255), 8)

                    frame = cv2.putText(frame, str(round(final[counter], 3)) + "%", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 234, 255), 3, cv2.LINE_AA)

                    if counter >= len(pose_arr_1) - 75:
                        frame = cv2.putText(frame, "Overall score: " + str(round(ff, 3)) + "%", (50, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 158, 255), 3, cv2.LINE_AA)

                except Exception as e:
                    
                    break
                out.write(frame)

                counter += 1
            else:
                break  

        capture3.release()
        out.release()
        cur_time = time.time()
        prev_time = cur_time

        i1 = ffmpeg.input(f'videos/{fileid}_1.mp4')
        audio = i1.audio

        
        os.system(f"ffmpeg -i videos/{fileid}_out.mp4 -vcodec libx264 videos/{fileid}_final.mp4")
        

        i2 = ffmpeg.input(f"videos/{fileid}_final.mp4")
        video = i2.video

        out1 = ffmpeg.output(audio, video, f'videos/{fileid}_audio.mp4')
        out1.run()

        os.remove("videos/" + fileid + "_1.mp4")
        os.remove("videos/" + fileid + "_2.mp4")
        os.remove("videos/" + fileid + "_out.mp4")
        os.remove("videos/" + fileid + "_final.mp4")
        return {"status": "success", "fileid": fileid, "overall_score": ff, "frames": final,
        "left_hand": left_hand, "left_hand_overall": left_hand_overall, "left_leg": left_leg, "left_leg_overall": left_leg_overall,
        "right_hand": right_hand, "right_hand_overall": right_hand_overall, "right_leg": right_leg, "right_leg_overall": right_leg_overall}
    except Exception as e:
        print(e)
        return {"status": "failed"}

@app.get("/getexisting")
async def read_item1(fileid: str):
    try:
        def iterfile():
            with open(fileid, mode="rb") as file_like:  
                yield from file_like
        return StreamingResponse(iterfile(), media_type="video/mp4")
    except:
        return "failed"

@app.get("/getvideo")
async def read_item(fileid: str):
    try:
        def iterfile():
            with open("videos/" + fileid + "_audio.mp4", mode="rb") as file_like:  
                yield from file_like
        return StreamingResponse(iterfile(), media_type="video/mp4")
    except:
        return "failed"

@app.get("/deletevideo")
async def delete_item(fileid: str):
    try:
        os.remove("videos/" + fileid + "_audio.mp4")
        return {"status": "success"}
    except:
        return {"status": "failed"}

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, log_level="info")