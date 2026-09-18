const input = document.getElementById("files");
const fileList = document.getElementById("fileList");
const uploadButton = document.getElementById("uploadButton");
const status = document.getElementById("status");

input.addEventListener("change", showFiles);

function showFiles() {

    fileList.innerHTML = "";
    status.textContent = "";

    if (input.files.length === 0) {

        uploadButton.disabled = true;

        return;
    }

    uploadButton.disabled = false;

    for (const file of input.files) {

        const div =
            document.createElement("div");

        div.className = "file";

        const size =
            (file.size / 1024 / 1024).toFixed(1);

        div.textContent =
            "📷 " +
            file.name +
            " • " +
            size +
            " MB";

        fileList.appendChild(div);
    }
}


uploadButton.addEventListener(
    "click",
    uploadPhotos
);


async function uploadPhotos() {

    if (input.files.length === 0) {
        return;
    }

    uploadButton.disabled = true;

    status.textContent =
        "Šaljem fotografije...";


    const formData =
        new FormData();


    for (const file of input.files) {

        formData.append(
            "photos",
            file
        );

    }


    try {

        const response =
            await fetch(
                "/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Greška prilikom slanja."
            );

        }


        status.textContent =
            "✓ " + result.message;


        fileList.innerHTML = "";

        input.value = "";

    } catch (error) {

        console.error(error);

        status.textContent =
            "✕ " + error.message;

    }


    uploadButton.disabled = false;
}