#!/usr/bin/env python3
"""Extract exact zero-time first frames and detect native letterbox margins with ffmpeg.
Uses free tools on the existing public GitHub Actions runner; never edits originals.
"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
CAT=json.loads((ROOT/"mobile/catalog.json").read_text())
SITE=json.loads((ROOT/"mobile/site-content.json").read_text())
INDEX=ROOT/"mobile/video-framing.json"

def run(*args):
    result=subprocess.run(args,text=True,capture_output=True,check=False)
    if result.returncode:
        raise RuntimeError("Video preparation failed for "+str(args[-1])+": "+result.stderr[-1500:])
    return result

def sources():
    paths={}
    def add(video,poster,directory):
        if not video: return
        expected=Path(video).stem+"-first-frame.jpg"
        if poster!=expected: raise ValueError("Non-first-frame poster "+str(video)+" "+str(poster))
        source=ROOT/directory/video
        if not source.is_file(): raise FileNotFoundError(source)
        paths[video]=(source,ROOT/directory/expected)
    for v in CAT["opening"]["segments"]:
        add(v,Path(v).stem+"-first-frame.jpg","assets/vario")
    if CAT["opening"].get("mobileVideo"):
        add(CAT["opening"]["mobileVideo"],CAT["opening"]["mobilePoster"],"assets/vario")
    for model in CAT["models"]:
        add(model.get("video"),model.get("videoPoster"),"assets/vario")
        for reel in model.get("extraVideos",[]):
            add(reel["video"],reel["poster"],"assets/vario")
    for lake in SITE["lakeSources"].values():
        add(lake["video"],lake["poster"],"assets/lake-placeholders")
    return paths

def estimate_zoom(path):
    probe=json.loads(run("ffprobe","-v","error","-select_streams","v:0",
                         "-show_entries","stream=width,height","-of","json",str(path)).stdout)
    width,height=(int(probe["streams"][0][k]) for k in ("width","height"))
    result=subprocess.run(["ffmpeg","-hide_banner","-loglevel","info","-nostdin","-ss","0.35",
                           "-i",str(path),"-an","-vf","cropdetect=limit=22:round=2:reset=0",
                           "-frames:v","14","-f","null","-"],capture_output=True,text=True)
    candidates=re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)",result.stderr)
    if not candidates: return 1.0,[width,height,0,0],str(width)+"x"+str(height)
    cw,ch,x,y=map(int,candidates[-1])
    if cw<width*.69 or ch<height*.69 or cw>width or ch>height:
        return 1.0,[width,height,0,0],str(width)+"x"+str(height)
    left,right=x,width-x-cw
    top,bottom=y,height-y-ch
    bars_x=left>=width*.012 and right>=width*.012 and abs(left-right)<=width*.042
    bars_y=top>=height*.012 and bottom>=height*.012 and abs(top-bottom)<=height*.042
    zoom=min(1.52,max(width/cw if bars_x else 1.0,height/ch if bars_y else 1.0)*1.008)
    return (round(zoom,3) if zoom>=1.035 else 1.0),[cw,ch,x,y],str(width)+"x"+str(height)

def main():
    old=json.loads(INDEX.read_text()) if INDEX.exists() else {}
    cache=old.get("videos",{}) if old.get("schemaVersion")==1 else {}
    result={}
    fresh=0
    for name,(source,poster) in sorted(sources().items()):
        digest=hashlib.sha256(source.read_bytes()).hexdigest()
        entry=cache.get(name)
        if entry and entry.get("sha256")==digest and poster.exists():
            result[name]=entry
            continue
        run("ffmpeg","-hide_banner","-loglevel","error","-nostdin","-y",
            "-i",str(source),"-map","0:v:0","-frames:v","1","-vf",
            "scale=1920:1920:force_original_aspect_ratio=decrease",
            "-q:v","3",str(poster))
        if poster.stat().st_size<1200: raise RuntimeError("Invalid poster "+str(poster))
        zoom,crop,res=estimate_zoom(source)
        result[name]={"sha256":digest,"poster":poster.name,"zoom":zoom,
                      "crop":crop,"resolution":res}
        fresh+=1
        if zoom>1.025: print("NATIVE_BLACK_BARS",name,"zoom",zoom,"crop",crop)
    if len(result)<55: raise ValueError("Incomplete first-frame coverage "+str(len(result)))
    INDEX.write_text(json.dumps({"schemaVersion":1,"videos":result},indent=2)+"\n")
    print("FIRST_FRAME_PASS",len(result),"videos",fresh,"reextracted",
          sum(v["zoom"]>1.025 for v in result.values()),"detected with black bars")

if __name__=="__main__":
    main()
