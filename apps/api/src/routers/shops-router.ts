import { Router } from "express";

import { ApiError } from "../core/api-error";
import { asyncHandler, getOptionalNumberQuery, getPathParam, sendItem, sendItems } from "../core/http";
import { loadFavoriteLocationIds, normalizeDeviceKey } from "../preferences";
import { getApprovedShopBySlug, listApprovedShops } from "../shops";

export function createShopsRouter() {
  const router = Router();

  router.get(
    "/shops",
    asyncHandler(async (req, res) => {
      const deviceKey = normalizeDeviceKey(req.header("X-QApp-Device-Id"));
      const favoriteLocationIds = await loadFavoriteLocationIds(deviceKey);
      const items = await listApprovedShops({
        latitude: getOptionalNumberQuery(req.query.latitude),
        longitude: getOptionalNumberQuery(req.query.longitude),
        limit: getOptionalNumberQuery(req.query.limit),
        favoriteLocationIds
      });

      sendItems(res, items);
    })
  );

  router.get(
    "/shops/:slug",
    asyncHandler(async (req, res) => {
      const item = await getApprovedShopBySlug(getPathParam(req.params.slug));

      if (!item) {
        throw ApiError.notFound("Shop not found.");
      }

      sendItem(res, item);
    })
  );

  return router;
}
