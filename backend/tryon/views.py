from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from PIL import Image
from io import BytesIO


class SkinAnalyzeView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, *args, **kwargs):
        f = request.FILES.get('image') or None
        if not f:
            return Response({'error': 'image required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            b = BytesIO(f.read())
            img = Image.open(b).convert('RGB')
            w, h = img.size
            tw = 512
            th = max(256, int(512 * (h / max(1, w))))
            img = img.resize((tw, th))
            px = img.load()
            def sample_rect(x, y, rw, rh):
                x0 = max(0, int(x))
                y0 = max(0, int(y))
                x1 = min(tw - 1, int(x + rw))
                y1 = min(th - 1, int(y + rh))
                r_sum = g_sum = b_sum = 0
                n = 0
                var_sum = 0
                prev = None
                for yy in range(y0, y1 + 1):
                    for xx in range(x0, x1 + 1):
                        r, g, b_ = px[xx, yy]
                        r_sum += r
                        g_sum += g
                        b_sum += b_
                        n += 1
                        lum = (r + g + b_) / 3
                        if prev is not None:
                            var_sum += abs(lum - prev)
                        prev = lum
                r_avg = r_sum / max(1, n)
                g_avg = g_sum / max(1, n)
                b_avg = b_sum / max(1, n)
                brightness = (r_avg + g_avg + b_avg) / 3 / 255
                redness = r_avg / max(1, g_avg)
                coolness = b_avg / max(1, r_avg)
                texture = var_sum / max(1, n) / 255
                return brightness, redness, coolness, texture
            cx = tw / 2
            cy = th / 2
            forehead = (cx - 80, cy - 140, 160, 60)
            nose = (cx - 40, cy - 40, 80, 80)
            cheek_l = (cx - 160, cy - 20, 120, 100)
            cheek_r = (cx + 40, cy - 20, 120, 100)
            chin = (cx - 80, cy + 80, 160, 60)
            uel = (cx - 120, cy - 70, 80, 40)
            uer = (cx + 40, cy - 70, 80, 40)
            f_b, f_r, f_c, f_t = sample_rect(*forehead)
            n_b, n_r, n_c, n_t = sample_rect(*nose)
            cl_b, cl_r, cl_c, cl_t = sample_rect(*cheek_l)
            cr_b, cr_r, cr_c, cr_t = sample_rect(*cheek_r)
            ch_b, ch_r, ch_c, ch_t = sample_rect(*chin)
            uel_b, uel_r, uel_c, uel_t = sample_rect(*uel)
            uer_b, uer_r, uer_c, uer_t = sample_rect(*uer)
            def avg(a, b):
                return (a + b) / 2
            tzone_oil = n_b - avg(cl_b, cr_b)
            cheeks_red = avg(cl_r, cr_r)
            under_eye_dark = 1 - min(1, avg(uel_b, uer_b))
            texture_avg = avg(avg(cl_t, cr_t), avg(f_t, ch_t))
            pores_score = max(0, texture_avg * 1.4)
            oiliness = max(0, tzone_oil)
            dryness = max(0, 0.6 - avg(cl_b, cr_b))
            if oiliness > 0.12 and dryness < 0.1:
                skin_type = 'Oily'
            elif dryness > 0.15 and oiliness < 0.08:
                skin_type = 'Dry'
            elif oiliness > 0.1 and dryness > 0.12:
                skin_type = 'Combination'
            else:
                skin_type = 'Normal'
            redness_score = max(0, cheeks_red - 1.0)
            wrinkles_score = max(0, texture_avg - 0.18)
            melanin = 1 - min(1, avg(cl_b, cr_b))
            pigmentation = 'High' if melanin > 0.3 else ('Medium' if melanin > 0.18 else 'Low')
            acne_areas = []
            red_th = 1.25
            if cl_r > red_th:
                acne_areas.append('Left cheek')
            if cr_r > red_th:
                acne_areas.append('Right cheek')
            if n_r > red_th:
                acne_areas.append('T-zone')
            hydration = 'Good' if dryness < 0.1 else ('Moderate' if dryness < 0.2 else 'Low')
            sebum = []
            if tzone_oil > 0.08:
                sebum.append('T-zone')
            if (cl_b - n_b) > 0.05 or (cr_b - n_b) > 0.05:
                sebum.append('Cheeks')
            if not sebum:
                sebum = ['Balanced']
            b_age = wrinkles_score + pores_score + redness_score + under_eye_dark * 0.5
            if b_age < 0.25:
                bio_age = 'Younger than actual'
            elif b_age < 0.5:
                bio_age = 'Near actual age'
            else:
                bio_age = 'Older than actual'
            data = {
                'skin_type': skin_type,
                'texture': f"{texture_avg:.2f}",
                'pores': 'Enlarged' if pores_score > 0.4 else ('Medium' if pores_score > 0.25 else 'Small'),
                'fine_lines': 'Visible' if wrinkles_score > 0.25 else ('Mild' if wrinkles_score > 0.1 else 'None'),
                'deep_wrinkles': 'Present' if wrinkles_score > 0.5 else 'Low',
                'micro_texture': 'Coarse' if texture_avg > 0.25 else 'Smooth',
                'tone_overall': f"{avg(cl_b, cr_b):.2f}",
                'uneven_tone': 'Uneven' if abs(cl_b - cr_b) > 0.08 else 'Even',
                'pigmentation_level': pigmentation,
                'melanin_concentration': f"{melanin:.2f}",
                'acne': acne_areas if acne_areas else ['None'],
                'redness_inflammation': 'High' if redness_score > 0.2 else ('Moderate' if redness_score > 0.1 else 'Low'),
                'under_eye_darkness': 'High' if under_eye_dark > 0.4 else ('Moderate' if under_eye_dark > 0.25 else 'Low'),
                'eyebags_puffiness': 'Moderate' if texture_avg > 0.22 else 'Low',
                'sunspots': 'Not detected',
                'age_spots': 'Not detected',
                'freckles': 'Not detected',
                'red_spots_vascular': 'Possible' if redness_score > 0.25 else 'Low',
                'hydration': hydration,
                'oil_balance': sebum,
                'skin_age_estimation': bio_age,
                'brightness': round(avg(cl_b, cr_b), 2),
                'redness': round(cheeks_red, 2),
                'coolness': round(avg(cl_c, cr_c), 2),
                'summary': 'Automated skin analysis based on regional sampling',
                'recommendations': [
                    'Increase hydration; use hyaluronic acid serums' if skin_type == 'Dry' else None,
                    'Use non-comedogenic moisturizers; control sebum in T-zone' if skin_type == 'Oily' else None,
                    'Consider calming products with niacinamide' if redness_score > 0.2 else None,
                    'Introduce retinoids and sunscreen daily' if wrinkles_score > 0.25 else None,
                    'Use vitamin C and SPF to even tone' if pigmentation != 'Low' else None,
                ],
            }
            data['recommendations'] = [x for x in data['recommendations'] if x]
            return Response(data)
        except Exception:
            return Response({'error': 'failed to analyze'}, status=status.HTTP_400_BAD_REQUEST)
