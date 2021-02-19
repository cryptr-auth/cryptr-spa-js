const TokenFixture = {
  accessToken: {
    // {
    //   "alg": "RS256",
    //   "iss": "http://localhost:4000/t/cryptr",
    //   "kid": "3fc16816-0f99-484f-b3d1-87c22ae15b9c",
    //   "typ": "JWT"
    // }
    // {
    //   "aud": "http://localhost/",
    //   "cid": "1c2417e6-757d-47fe-b564-57b7c6f39b1b",
    //   "dbs": "default",
    //   "exp": 2244593517000,
    //   "iat": 1613441920322,
    //   "iss": "http://localhost:4000/t/cryptr",
    //   "jti": "9ec0e7c3-90ba-42c5-902a-efb569b325a1",
    //   "jtt": "access",
    //   "resource_owner_metadata": {},
    //   "scp": [
    //     "openid",
    //     "email"
    //   ],
    //   "sub": "1c42cf4b-c83a-48e0-8593-8c2e59de2f03",
    //   "tnt": "cryptr",
    //   "ver": 1
    // }
    valid: (): string =>
      'eyJhbGciOiJSUzI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMC90L2NyeXB0ciIsImtpZCI6IjNmYzE2ODE2LTBmOTktNDg0Zi1iM2QxLTg3YzIyYWUxNWI5YyIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJodHRwOi8vbG9jYWxob3N0LyIsImNpZCI6IjFjMjQxN2U2LTc1N2QtNDdmZS1iNTY0LTU3YjdjNmYzOWIxYiIsImRicyI6ImRlZmF1bHQiLCJleHAiOjIyNDQ1OTM1MTcwMDAsImlhdCI6MTYxMzQ0MTkyMDMyMiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo0MDAwL3QvY3J5cHRyIiwianRpIjoiOWVjMGU3YzMtOTBiYS00MmM1LTkwMmEtZWZiNTY5YjMyNWExIiwianR0IjoiYWNjZXNzIiwicmVzb3VyY2Vfb3duZXJfbWV0YWRhdGEiOnt9LCJzY3AiOlsib3BlbmlkIiwiZW1haWwiXSwic3ViIjoiMWM0MmNmNGItYzgzYS00OGUwLTg1OTMtOGMyZTU5ZGUyZjAzIiwidG50IjoiY3J5cHRyIiwidmVyIjoxfQ.qfP0KufM160SNsnv92CJQjkU_AHiGVZ6rKL56QaVMjPT1RDZS9-ezR3ojJxNFdDYkdhLqiegh5-KANJbMoWPOwPLr-n0xNtM6curTdZ9AwtfLb9G16WOvGzoMd__WTjWUANXT3qt3RBTyn0sWFA7QvMl5PtEeKV7mRgvypMQXplSTtPPTbqV6SZvaZNCKoMkmN2HTKBAN5e-DzGiSzwRfx78vGuCvwcc8HxHGx3ud3_rBbucyycqfcXdp1It9rvExR__ECSPIWXgzyaEI9B4nN67cQy5LpYQo7eDRTDgglSd9Dt55jp_x2YsUDwYjkeiXPumej1KZ2S1ioCKRjmLeCRLBlfQHEqebcDnJ6MpixrFyJWUe19JPWDko5cDv7VThug_n1_Ch62o8QXQf3vu8hwVZxpSC1YwfpIt7ralIo7-v9QHJd2OxjAt1QgrcsvbyGSXXuIbaJ2eqYw2Yf8SCC3i_4bVUeFkjafvWCqkS72EvcwoxdAYmuUwlBMy5nYqD3Yrx_QeT-pJbt8TRLMEURTXd_CO74yWvPTHs4SdNL0f6imaQpH5-VDhr9DYoB68toMlxrbJTfZH7d89eWwuVp2qu4HulFAB8uo6E5MM7pp61sPSE6NVe4XFOcydJ_2gYXHbhia-lKYPQsWSuRefCbe388U8ToPy1kOnPPgT5n4',
    validForThibs: (): string =>
      'eyJhbGciOiJSUzI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMC90L21pc2FwcmV0Iiwia2lkIjoiOTJlODM0MGItNGViOS00ODczLWIzMDYtZjA5M2FhNWEzNDNjIiwidHlwIjoiSldUIn0.eyJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJjaWQiOiI0MmJkYjkxOS1iNGE0LTQ4MTYtODJjNC05YjIxZmY1NDY4NzYiLCJleHAiOjE1OTk3NjE5OTk4NzMsImlhdCI6MTU5OTcyNTk5OTg3MywiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo0MDAwL3QvbWlzYXByZXQiLCJqdGkiOiIwYmFhNzNkNC02OTA4LTRlMmMtYTAzZi0yNTkxNGU0YTIwOWYiLCJqdHQiOiJhY2Nlc3MiLCJyZXNvdXJjZV9vd25lcl9tZXRhZGF0YSI6eyJjdXJyZW50X3Byb2plY3RfaWQiOiJmNWNlMDQ0Ny0xNjNkLTQ5ZmMtYTI5ZS1iZDgyMjljMWE1ZTYifSwic2NwIjpbInByb2ZpbGUiXSwic3ViIjoiMTllZTBhNmMtNzNlMy00MTZhLWI2YTQtY2VlYjM2ZGE5ZTZhIiwidG50IjoibWlzYXByZXQiLCJ2ZXIiOjF9.WAqSl4qsdL72MigrPUVYEkI9mI4RvMzlc_pP6iTxm1tvnsO2g3m5TSTmsLRTjD4hbHxS_kXbCE7ZectOt2gyVHSXxhsj1KbhIE50U5Nbocpn2s7dLt0N3tpyk1O22f5mw7OWZmQ13kaXYHFl5qi-DvckDyYjLCdptJV8zqC_GbDtXjEi3GgrQFh0BhrdWcv9UDgT0K01uuNktfSwBJHwnl_M4qjSRYIn_MGgHiyU7Obi55vYFPGN7cmSHKo259N6Y6GYeQ6BU0AwQu-j35kmK6uuthF3uL7jNDUMF5Gxa0WpDVmXBVDTbaglaXSHAJU-LzIbak2D2ErxFtjqeIv4puU3hzT2Dbj796sotZjt_cRmEfJrbciG9ySS_ui8alfGYWelRe_jIEO8U3rBbUVYbj2FCQ-N2oIfyeTJRyhlpEq7VgDteF3B4nTfiJfqnxbWdNJIjLU2sl3bErcotBylEwD4a2_dIwWcR16xQ96d7LbdIAR294WGCYXpFkV8rpbktTZJ9GzJYrdzDNfRuEn6pArBbf4A0npPW_S64KB7H-gvJR-qCfR4XERqAAj7TjHCrZs3xHvw6oYfkiOjjjJWkhI2sr6dT3_vPuXjRV4PgYg3iQsNMXhlpYrTUihfkrnucBdNsdB_y3rQDn2UGSMSjSmCSEbV1NqHUsuCnsLSVnU',
    invalid: (): string =>
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  },
  idToken: {
    // {
    //   "alg": "RS256",
    //   "iss": "http://localhost:4000/t/cryptr",
    //   "kid": "3fc16816-0f99-484f-b3d1-87c22ae15b9c",
    //   "typ": "JWT"
    // }
    // {
    //   "at_hash": "7sztJS__hNu0P_ZNOe-tMQ",
    //   "aud": "http://localhost/",
    //   "c_hash": "VJdGCxphGBH6qNyY2wCktQ",
    //   "cid": "1c2417e6-757d-47fe-b564-57b7c6f39b1b",
    //   "dbs": "default",
    //   "email": "test006@mail.com",
    //   "exp": 2244593517000,
    //   "gender": "female",
    //   "given_name": "sfdsf",
    //   "iat": 1613441920329,
    //   "iss": "http://localhost:4000/t/cryptr",
    //   "jti": "f6342466-a2cc-4c38-a9d7-5b9abbef7eab",
    //   "jtt": "openid",
    //   "nonce": "431b9236-283a-4760-9022-cd68bc4875a9",
    //   "s_hash": "ZOzG0p6Q-SKdsUTjWWwuqg",
    //   "scp": [
    //     "openid",
    //     "email"
    //   ],
    //   "sub": "1c42cf4b-c83a-48e0-8593-8c2e59de2f03",
    //   "tnt": "cryptr",
    //   "ver": 1
    // }
    valid: (): string =>
      'eyJhbGciOiJSUzI1NiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDAwMC90L2NyeXB0ciIsImtpZCI6IjNmYzE2ODE2LTBmOTktNDg0Zi1iM2QxLTg3YzIyYWUxNWI5YyIsInR5cCI6IkpXVCJ9.eyJhdF9oYXNoIjoiN3N6dEpTX19oTnUwUF9aTk9lLXRNUSIsImF1ZCI6Imh0dHA6Ly9sb2NhbGhvc3QvIiwiY19oYXNoIjoiVkpkR0N4cGhHQkg2cU55WTJ3Q2t0USIsImNpZCI6IjFjMjQxN2U2LTc1N2QtNDdmZS1iNTY0LTU3YjdjNmYzOWIxYiIsImRicyI6ImRlZmF1bHQiLCJlbWFpbCI6InRlc3QwMDZAbWFpbC5jb20iLCJleHAiOjIyNDQ1OTM1MTcwMDAsImdlbmRlciI6ImZlbWFsZSIsImdpdmVuX25hbWUiOiJzZmRzZiIsImlhdCI6MTYxMzQ0MTkyMDMyOSwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo0MDAwL3QvY3J5cHRyIiwianRpIjoiZjYzNDI0NjYtYTJjYy00YzM4LWE5ZDctNWI5YWJiZWY3ZWFiIiwianR0Ijoib3BlbmlkIiwibm9uY2UiOiI0MzFiOTIzNi0yODNhLTQ3NjAtOTAyMi1jZDY4YmM0ODc1YTkiLCJzX2hhc2giOiJaT3pHMHA2US1TS2RzVVRqV1d3dXFnIiwic2NwIjpbIm9wZW5pZCIsImVtYWlsIl0sInN1YiI6IjFjNDJjZjRiLWM4M2EtNDhlMC04NTkzLThjMmU1OWRlMmYwMyIsInRudCI6ImNyeXB0ciIsInZlciI6MX0.zSWrifUbFCRJmcb6i8YRRgFobHFDVJNFjydIu4vRpD_AY1FAg0h8EmB3eOFF8Ie3DqlOu0OlPWOmCgxwTvQcQNXM4Fp_OvtI1KEP7PxHP-BkD64ZQaxXBiqOMdpxC_TqyB1F0EABCDCOC9LPNuBv5Rs_9QuuxFrDsQ0E-OARQmqD-wUd1x1Gv2a-3yAkWAFK_4F9F-eoEaVsk9NcMLIZloN1q9Ci8WZEaTXNAKJU42x8cddjDS9_GyEW3ez4mv6Kuy5Xng8ZbPLCL85eLFyJM-NqAbogoQlIbgNy6JOzYfrSSghs_7bf1OliwoLzUBrnMN8X-k-hPTk02OuEO4RUF16axVM5lkvIbrdM-zzlp6ehKepvp6fXHKlnLdwSs7VRBZBo4ZSENeOtnbh-aKdDJ-X5BYxqHD6rYaWufsUt67QByC5m5jlp2gu-NWOSWkrEimEwIIh-xE6XSLgxlw1nhiXOTtENAqhY3OZObQ5nf7P8IaqWnI5WM2ro-4ygEmnCjkFpPDdw-jDPJVq--dYSzil_-9gSpqdOcJsqiVFxy6Fr-1Z4UtNkamjDlLGKVdzf708tutq_1AlsLUgkQippX-DAvw2Fx_CaprMb6g2GozmCQYq0WcndWi98ZO0EwGiwP0jc71T9viCQIJpmWICupyzMxkb7KwPKlMX0JYsA1lI"',
  },
  refreshToken: {
    valid: (): string => 'ACguBexb31BbB2jQ2mC896ZNx4rO_kyFOIE7iF5HmM4',
    validForThibs: (): string => 'ZQ9eg2os1fgLZFH_sWeV3mETiF8PzHkdsMZkDkzo6Do',
    wrong: (): string => 'azerty',
  },
}
export default TokenFixture
