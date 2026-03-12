import os
import urllib.request
import json
import ssl

ssl._create_default_https_context = ssl._create_unverified_context

data = [
    {
        "title": "Wois Note Detail - Monochrome",
        "htmlUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2Y1NGQ1NDU0ZGE1MDQyYjBiMmU0ZWQ3MTE4NjYwMDkyEgsSBxD_6ryJigkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDEzNzUzOTgxODY5NzA1MzA5Nw&filename=&opi=89354086",
        "imgUrl": "https://lh3.googleusercontent.com/aida/AOfcidVuECIcY7_S848Km0M4ikAVdFGqO6j7vOen866moMhcAVxEXPQ2WJ1P2L0Bs9DEDB0ElKBVX1GpoN0IVS0zZwE0H5V3dL6beX9pYEiBlaH0AlkHXAt0h06SVzpip4_CXJZ_63d3VQepc3QMpkeBAXBsyaqzhMccRAaUlnNuNEHHnJ8lrC2-rMQ-QeS7HrTNWu-tIlvZFiwLO0AZgFIBiCZPPjh8i8tpxa6HpcfD5Gd_C2cUkaF1VZDEGF4"
    },
    {
        "title": "Wois Recording - Monochrome",
        "htmlUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzVkZDkwMzIwZTZhMjQ2ZGNhOWJlY2MxMDU5NzFlZGJjEgsSBxD_6ryJigkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDEzNzUzOTgxODY5NzA1MzA5Nw&filename=&opi=89354086",
        "imgUrl": "https://lh3.googleusercontent.com/aida/AOfcidWRWOa--9iDC2Kq9cehbSRhpFPIxLCZZXAezASEn0cvcqKx4FytdegUHLbt8vbIwZVk5hDPeKdyi8v5B6iK_3EJKta6Gz2JIApQ2N-BR7u8GvaKcoaf55r5hasP2ihmEFEvBhsvBxNqxevfVZQJAx02qn1RIYPXtequ4hWCYyE6CX0-7hMdbGaCcmQUgwATzsmlwoxHhlmkFdQGKMuLxsfUINMAAWIbZw0bTJ6UQFgRjdAZmNX4IwtUhu4"
    },
    {
        "title": "Wois Dashboard - Monochrome",
        "htmlUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2FlYzJmNjk1ZjRlZDQ2NzZiNWRjMDYxMTliOTU1NzBlEgsSBxD_6ryJigkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDEzNzUzOTgxODY5NzA1MzA5Nw&filename=&opi=89354086",
        "imgUrl": "https://lh3.googleusercontent.com/aida/AOfcidW2mMm6Zn4q_EyY3eGjN9VdT1XpwfYpSgcqosYToDgXBolVSm-rT49phu1tr9i2myzCB2uVRKEcNhLIheAVYLGD2uoOAbxuuVkC1srVDCShIbZYioTWSyihHPIdY6f0fmHJBEFMIKMvxtDu7VwYxHUhKzxKVCM693wfdf2uE_qwnedw3ISABHNlLdu7jhKYHOplWubrHm740y7XHiHRu1MtDNvF_5bET43vvwScGZS2Zu3-n_MkYd-H_e4O"
    },
    {
        "title": "Wois Dashboard - Mobile",
        "htmlUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzlmYjU0ZjkyYzk1ZjRiMzg4ZTBhM2FmZjgzZDAwNWRkEgsSBxD_6ryJigkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDEzNzUzOTgxODY5NzA1MzA5Nw&filename=&opi=89354086",
        "imgUrl": "https://lh3.googleusercontent.com/aida/AOfcidUS44LhFkXC2-Ba2lo955_DZJ_JjYe9DLxGE_0GsOIOdIeNTaXV5bGS_LimtmqiM6jlHaLY7FP5sxtfYLFqPIZ7bnWX6UJVB9pKLFeQ9aE42gjsJOBJjH19WB1kvc4QaL7oPO7nsvYtblRiy3hCpCkBXWCrEPqRg0vN80XULfoIUw11-mMUTNfITKRJuJBEYSHJlefHGQnrfaHkokp2t5spRdhS_uEz7QPHXHPho9cKXyNqHpJUBouxdRuv"
    },
    {
        "title": "Wois Recording - Mobile",
        "htmlUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2JiNmQ2Yjk1OWY1MzQ2M2M5ZTcyNjE4M2U5NTAxZjQyEgsSBxD_6ryJigkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDEzNzUzOTgxODY5NzA1MzA5Nw&filename=&opi=89354086",
        "imgUrl": "https://lh3.googleusercontent.com/aida/AOfcidWqS-46AEweb09mEGftM_H2jBy4TC4SdYPhwnYluLBz-yda5kMIrVPRv8WyRQHg2Xv7VnMDsUMQRGtstMGQCojhAXvKDEBpSYXn8rCOCj4H-M-om-lUrUSewSpwt7X-yl2915F8TWrwmstXQUBpQGyZ0yoah2aCvy9MtKSYggxxqRzJvtTeX3eJXaNPc6lclo7gU3fWvwr-ShCeRrfTcaw_WeTeaPdwldiVI7sxt7BNoOyhIy15QLJlDA73"
    },
    {
        "title": "Wois Note Detail - Mobile",
        "htmlUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzA1ZjY3ODFkMDE0YjQyMWE4NWE5ZDFhM2Y2MGIwNmNjEgsSBxD_6ryJigkYAZIBJAoKcHJvamVjdF9pZBIWQhQxNDEzNzUzOTgxODY5NzA1MzA5Nw&filename=&opi=89354086",
        "imgUrl": "https://lh3.googleusercontent.com/aida/AOfcidX-nCDyQmnwfGazTMBDZTb-4RGrDYktwZkwaaHTeStXRy6Ixha7J-YyHt2sKmkMq491h2x9MYVAhV7q8mfpKW8ID4RTpnfx5mP9oY39Vq6js5At43O0U9eL4oITKMxln-0ne_BcUOV-B4J3zppXB73a5r4qK4WmwmlU1HM0B8S9rrlo7bY89ju9NF81ucCSFtOgYaRQC8jbcCUp_W9ojPF83OCoiN_RgutG_yuPVNpEiyNe7ae_LW4vUdvi"
    }
]

os.makedirs('d:/me/wois/wois_design', exist_ok=True)
for item in data:
    safe_title = item['title'].replace(' ', '_').replace('-', '_')
    print(f"Downloading {safe_title}...")
    req = urllib.request.Request(item['htmlUrl'], headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response, open(f"d:/me/wois/wois_design/{safe_title}.html", 'wb') as out_file:
            out_file.write(response.read())
        
        req_img = urllib.request.Request(item['imgUrl'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_img) as response, open(f"d:/me/wois/wois_design/{safe_title}.png", 'wb') as out_file:
            out_file.write(response.read())
    except Exception as e:
        print(f"Error downloading {safe_title}: {e}")

print("Done")
