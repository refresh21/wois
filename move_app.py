import os
import shutil

source = 'tmpapp'
dest = '.'

if not os.path.exists(source):
    print("Source tmpapp does not exist")
    exit(1)

for item in os.listdir(source):
    s = os.path.join(source, item)
    d = os.path.join(dest, item)
    print(f"Moving {s} to {d}")
    if os.path.isdir(s):
        shutil.move(s, d)
    else:
        shutil.move(s, d)

os.rmdir(source)
print("Move complete")
