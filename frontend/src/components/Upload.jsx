import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function UploadPage(props) {
    const [status, setStatus] = useState("");
    const navigate = useNavigate();
    const callbackFunction = props.callback;

    function handleChange(event){
        const file = event.target.files[0];
        event.preventDefault();
        const url = import.meta.env.VITE_BACKEND + "api/binary_ingest/";
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        let timeProcessing = 0;
        const config = {
            headers: {
                'content-type': 'multipart/form-data'
            }
        }
        let state;
        setStatus("Uploading...");
        axios.post(url, formData, config).then((response => {
            /* If project_id is null, it is still processing/queued! */
            if(response.data.project_id != null){
                console.log(response.data)
                const file_id = response.data.file_id;
                const url = `${import.meta.env.VITE_BACKEND}api/funcs/`;
                axios.post(url, {"project_id": response.data.project_id}).then(response => {
                    callbackFunction ? callbackFunction(): '';
                    navigate("/analysis", {state: {funcs: response.data, file_id: file_id}, replace: true});
                })
            } else {
                setStatus("File queued...");
                const task_id = response.data.id;
                const timer = setInterval(() => {
                    const url = import.meta.env.VITE_BACKEND + "api/task/" + task_id;
                    const resp = axios.get(url).then((response => {
                        console.log(response);
                        if(response.data.status == "DONE" && response.data.task_type == "file_upload"){
                            clearInterval(timer);
                            const file_id = response.data.result.project_id;
                            const url = `${import.meta.env.VITE_BACKEND}api/funcs/`;
                            axios.post(url, {"project_id": response.data.result.project_id}).then(response => {
                                callbackFunction ? callbackFunction() : '';
                                navigate("/analysis", {state: {funcs: response.data, file_id: file_id}, replace: true});
                            })
                        }
                        if(response.data.status == "PROCESSING"){
                            setStatus(`Processing. Time elapsed: ${timeProcessing}s`);
                            timeProcessing += 1;
                        }
                        if(response.data.status == "DONE" && response.data.task_type == "error"){
                            let result = response.data.result.error;
                            // Pesky single quotes!
                            result = result.replace(/'/g, '"');
                            result = JSON.parse(result)
                            clearInterval(timer)
                            setStatus(`ERROR: ${result.error}`)
                        }
                    }))
                }, 1000);
            }
        })).catch(error => {
            if(error.response.data.error){
                setStatus(`ERROR: ${error.response.data.error} - ${error.response.data.error_info}`)
                return;
            }
        })
    }

    return (
        <div className="flex flex-col justify-center items-center p-4">
            <label htmlFor="file-upload" className="cursor-pointer m-4 px-6 py-3 hover:ring-2 text-white bg-ndblue rounded-md">Select file</label>
            <input id="file-upload" type="file" className="hidden" onChange={handleChange}/>
            <div className="p-2 font-mono">
                {status}
            </div>
            <div className="text-slate-400 italic text-xs">(2mb file upload limit)</div>
        </div>
    )
}