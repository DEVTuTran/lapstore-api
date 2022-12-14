import express from "express";
import orderController from "../controllers/order.controller";

const router = express.Router();

router.route("/payment").post(orderController.payment);

router.route("/list").get(orderController.listAllOrders);

router.route("/list/:id").get(orderController.listOrderByUser);

router.route("/cancel/:id").delete(orderController.cancelOrder);

router.route("/update/:id").put(orderController.updateStatusOrder);

router.route("/address/:id").put(orderController.updateShippingAddress);

router.route("/:id").get(orderController.getOrderById);

export const OrderRoute = router;
