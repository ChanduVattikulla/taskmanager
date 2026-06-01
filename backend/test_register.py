from app import create_app

app = create_app()
with app.test_client() as client:
    resp = client.post(
        '/api/auth/register',
        json={
            'email': 'testclient@example.com',
            'password': 'password123',
            'name': 'Test Client',
        },
    )
    print('status', resp.status_code)
    print(resp.get_json())
