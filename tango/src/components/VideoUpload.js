
import { useState } from "react";
export default function VideoUpload() {
  
  const [file, setFile] = useState(null);

  function handleChange(event) {
    console.log(`Selected file - ${event.target.files[0].name}`);
    setFile(event.target.files[0]);
  }

  return (
    <>
    <input type="file" accept="video/*" onChange={handleChange} />
    {file && 
    <video
      style={{maxWidth: "50%"}}
      controls
      src={URL.createObjectURL(file)}
    />}
    </>
  );

}