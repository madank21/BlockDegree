# TODO - Landing -> Login slowness

## Step 1: Identify cause
- [x] Reviewed `FRONTEND/src/pages/Landing.tsx` navigation logic (no API calls on click).
- [x] Reviewed `FRONTEND/src/App.tsx` redirect logic depending on `currentUser`.
- [x] Reviewed `FRONTEND/src/pages/Login.tsx` for duplicate API calls.

## Step 2: Code fix
- [x] Removed duplicate backend request by deleting `storeLogin(email, password)` call after `authApi.login(...)`.

## Step 3: Validate
- [ ] Run frontend dev/build and measure navigation time.
- [ ] If still slow, add timing logs around `useStore()`/any auth refresh in store.

