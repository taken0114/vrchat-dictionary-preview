"""Update the publication snapshot and deploy GitHub Pages."""
import base64, gzip, json, pathlib, subprocess, sys, urllib.request
from nacl.public import PublicKey, SealedBox

REPOSITORY = "taken0114/vrchat-dictionary-preview"
def credential():
    result = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n", text=True, capture_output=True, check=True)
    values = dict(line.split("=", 1) for line in result.stdout.splitlines() if "=" in line)
    if not values.get("password"):
        raise RuntimeError("GitHub authentication is unavailable")
    return values["password"]

def request(method, path, token, body=None):
    payload = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request("https://api.github.com" + path, data=payload, method=method,
        headers={"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json",
                 "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"})
    with urllib.request.urlopen(req) as response:
        value=response.read()
        return json.loads(value) if value else None

def main():
    filename=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "private-data/snapshot.json")
    dataset=json.loads(filename.read_text(encoding="utf-8-sig"))
    allowed={"id","title","body","url","category","aliases","tags","date","updatedAt"}
    if dataset.get("count")!=len(dataset.get("articles",[])):
        raise ValueError("Invalid snapshot count")
    if any(set(a)-allowed for a in dataset["articles"]):
        raise ValueError("The snapshot contains fields outside the publication schema")
    if len({a["id"] for a in dataset["articles"]})!=dataset["count"]:
        raise ValueError("Duplicate article ID")
    raw=json.dumps(dataset,ensure_ascii=False,separators=(",",":")).encode()
    encoded=base64.b64encode(gzip.compress(raw,mtime=0)).decode()
    parts=[encoded[i:i+40000] for i in range(0,len(encoded),40000)]
    if len(parts)>12: raise ValueError("Snapshot exceeds configured publication capacity")
    token=credential()
    key=request("GET","/repos/"+REPOSITORY+"/actions/secrets/public-key",token)
    box=SealedBox(PublicKey(base64.b64decode(key["key"])))
    for i in range(12):
        value=parts[i] if i<len(parts) else ""
        encrypted=base64.b64encode(box.encrypt(value.encode())).decode()
        request("PUT","/repos/"+REPOSITORY+"/actions/secrets/DICTIONARY_SNAPSHOT_"+str(i),token,
            {"encrypted_value":encrypted,"key_id":key["key_id"]})
    print("Publication snapshot updated:",dataset["count"],"articles")
    request("POST","/repos/"+REPOSITORY+"/actions/workflows/pages.yml/dispatches",token,{"ref":"main"})
    print("GitHub Pages deployment requested")

if __name__=="__main__":
    main()
