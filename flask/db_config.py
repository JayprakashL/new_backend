import mysql.connector

def db_connection():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="video_metadata"
    )
    return conn