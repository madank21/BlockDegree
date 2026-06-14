# TODO - Face preview not showing (FaceVerification)

- [ ] Add targeted diagnostics + fix camera start flow in `src/pages/FaceVerification.tsx`
  - [ ] Ensure `video.play()` failure is caught and logged
  - [ ] Wait for `loadedmetadata` before starting face detection
  - [ ] Confirm stage transitions and stream attachment
- [ ] Run typecheck/build (if available) and manually verify in browser

