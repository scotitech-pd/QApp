import { Router } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, getOptionalNumberQuery, getPathParam, sendItem, sendItems } from "../core/http";
import { listFavoriteShops, normalizeDeviceKey, setFavoriteShop } from "../preferences";

function requireDeviceKey(value: unknown) {
  const deviceKey = normalizeDeviceKey(value);

  if (!deviceKey) {
    throw ApiError.badRequest("Missing or invalid X-QApp-Device-Id header.");
  }

  return deviceKey;
}

export function createPreferencesRouter() {
  const router = Router();

  router.get(
    "/preferences/favorites",
    asyncHandler(async (req, res) => {
      const deviceKey = requireDeviceKey(req.header("X-QApp-Device-Id"));
      const items = await listFavoriteShops({
        deviceKey,
        latitude: getOptionalNumberQuery(req.query.latitude),
        longitude: getOptionalNumberQuery(req.query.longitude)
      });

      sendItems(res, items);
    })
  );

  router.put(
    "/preferences/favorites/:shopSlug",
    asyncHandler(async (req, res) => {
      const deviceKey = requireDeviceKey(req.header("X-QApp-Device-Id"));
      const item = await setFavoriteShop(deviceKey, getPathParam(req.params.shopSlug), true);
      sendItem(res, item);
    })
  );

  router.delete(
    "/preferences/favorites/:shopSlug",
    asyncHandler(async (req, res) => {
      const deviceKey = requireDeviceKey(req.header("X-QApp-Device-Id"));
      const item = await setFavoriteShop(deviceKey, getPathParam(req.params.shopSlug), false);
      sendItem(res, item);
    })
  );

  return router;
}
