from rest_framework.views import exception_handler as drf_exception_handler

def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is None:
        return response
    code_map = {
        400: 'bad_request',
        401: 'unauthorized',
        403: 'forbidden',
        404: 'not_found',
        429: 'too_many_requests',
        500: 'server_error',
    }
    response.data = {
        'code': code_map.get(response.status_code, 'error'),
        'detail': response.data.get('detail') if isinstance(response.data, dict) else str(response.data),
    }
    return response
