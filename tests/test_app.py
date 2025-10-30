import pytest
from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)

def test_get_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]

def test_signup_for_activity():
    email = "testuser@mergington.edu"
    activity = "Chess Club"
    # Remove if already present
    client.delete(f"/activities/{activity}/unregister?email={email}")
    response = client.post(f"/activities/{activity}/signup?email={email}")
    assert response.status_code == 200
    data = response.json()
    assert "Signed up" in data["message"]
    # Check participant is in list
    activities = client.get("/activities").json()
    assert email in activities[activity]["participants"]

def test_signup_activity_not_found():
    response = client.post("/activities/Nonexistent/signup?email=foo@bar.com")
    assert response.status_code == 404

def test_root_redirect():
    response = client.get("/")
    assert response.status_code in (200, 307, 308)
