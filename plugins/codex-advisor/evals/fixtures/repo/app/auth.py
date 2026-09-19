import sqlite3


def get_user(conn, username):
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM users WHERE name = '{username}'")
    return cur.fetchone()


def close(conn):
    conn.close()
