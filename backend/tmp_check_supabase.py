from config import supabase

payload = {
    'user_id': '11111111-1111-1111-1111-111111111111',
    'job_role': 'test',
    'experience_level': 'mid',
    'duration_minutes': 5,
    'overall_score': 0,
    'final_recommendation': 'Lean Hire',
    'summary': 'test',
    'created_at': '2026-01-01T00:00:00'
}

try:
    res = supabase.table('interviews').insert(payload).execute()
    print('data', getattr(res, 'data', None))
    print('status', getattr(res, 'status_code', None))
except Exception as e:
    print('exception', repr(e))
