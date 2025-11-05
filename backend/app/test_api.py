import requests

url = "http://127.0.0.1:8000/predict"
data = {
    "surname": "Shah",
    "location": "Mumbai",
    "age": 30,
    "sex": "M"
}

response = requests.post(url, json=data)
print(response.json())
