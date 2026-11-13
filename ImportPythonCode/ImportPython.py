
import pandas as pd
from flask import Flask, render_template

database = Flask(__name__)

# Read CSV
df = pd.read_csv("healthNasaData.csv")

# Convert DataFrame to dictionaries
data = df.to_dict("records")

@database.route("/")
def home():
    return render_template("index.html", products=data)

if __name__ == "__main__":
    database.run(debug=True)
