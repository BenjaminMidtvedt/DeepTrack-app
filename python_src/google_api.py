import requests
import os
import zipfile


# (dataset, folder name, model)
_ID = {
    "CellCounting": ("18Afk9Fwe4y3FVLPYd7fr4sfNIW59KEGR",),
    "MNIST": ("1UePQAYNp-ja9userMwTprIwGWjwCu3Tf",),
    "QuantumDots": ("1naaoxIaAU1F_rBaI-I1pB1K4Sp6pq_Jv",),
    "ParticleTracking": ("1eA9F_GjJbErkJu2TizE_CHjpqD6WePqy",),
    "ParticleSizing": ("1FaygrzmEDnXjVe_W3yVfqNTM0Ir5jFkR",),
    "MitoGAN": ("13fzMUXz3QSJPjXOf9p-To72K8Z0XGKyU",),
}


def load(tag, root):

    root = os.path.abspath(root)

    try:
        os.mkdir("datasets")
    except FileExistsError:
        pass

    destination = os.path.join(root, tag + ".zip")

    yield from download_file_from_google_drive(tag, destination)

    if os.path.exists(destination):
        with zipfile.ZipFile(destination) as file:
            print("Extracting files...")
            file.extractall(root)
            print("Done")
        print("Cleaning up...")
        os.remove(destination)
        print("...OK!")

        yield "DONE"

    else:
        print("Unable to download dataset")

        yield "ERROR"


def download_file_from_google_drive(id, destination):
    URL = "https://docs.google.com/uc?export=download"

    session = requests.Session()

    response = session.get(URL, params={"id": id}, stream=True)
    token = get_confirm_token(response)

    if token:
        params = {"id": id, "confirm": token}
        response = session.get(URL, params=params, stream=True)

    yield from save_response_content(response, destination)


def get_confirm_token(response):
    for key, value in response.cookies.items():
        if key.startswith("download_warning"):
            return value

    return None


def save_response_content(response, destination):
    CHUNK_SIZE = 32768 * 16
    idx = 0
    print("Starting")
    with open(destination, "wb") as f:

        for idx, chunk in enumerate(response.iter_content(CHUNK_SIZE)):

            download_counter = convert_size(CHUNK_SIZE * idx)
            if idx % 40 == 0:
                print("Downloading file:", download_counter, end="\r")

            if chunk:  # filter out keep-alive new chunks
                f.write(chunk)

            yield CHUNK_SIZE * idx

    yield os.path.getsize(destination)


import math


def convert_size(size_bytes):
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return "%s\t%s" % (s, size_name[i])
