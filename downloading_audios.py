import os
import re
import pandas as pd
import yt_dlp


AUDIO_FOLDER = "audio"
CSV_FILE = "list.csv"


def clean_filename(name):
    """
    Convert:
    'Cristiano Ronaldo'
    -> 'cristiano_ronaldo'
    """

    name = name.strip().lower()
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r"[^a-z0-9_]", "", name)

    return name


def download_audio(player_name, video_url):

    filename = clean_filename(player_name)

    ydl_opts = {
        "format": "bestaudio/best",

        "outtmpl": os.path.join(
            AUDIO_FOLDER,
            f"{filename}.%(ext)s"
        ),

        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": "192"
        }],

        "quiet": False
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"Downloading: {player_name}")
            ydl.download([video_url])
            print(f"Finished: {player_name}\n")

    except Exception as e:
        print(f"Failed: {player_name}")
        print(e)


def main():

    os.makedirs(AUDIO_FOLDER, exist_ok=True)

    df = pd.read_csv(CSV_FILE)

    for _, row in df.iterrows():

        player_name = row["name"]
        video_url = row["video_url"]

        download_audio(
            player_name,
            video_url
        )


if __name__ == "__main__":
    main()

