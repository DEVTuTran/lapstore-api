import express from "express";
import notificationController from "../controllers/notification.controller";

const router = express.Router();

router.route("/:id").get(notificationController.getNotificationByUser);

router.route("/:id").delete(notificationController.deleteOneNotification);

router.route("/:id").put(notificationController.editNotification);

export const NotificationRoute = router;
