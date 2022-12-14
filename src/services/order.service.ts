import { RestoreRequest } from "aws-sdk/clients/s3";
import { Request, Response } from "express";
import cartModel from "../models/cart.model";
import inventoryModel from "../models/inventory.model";
import orderModel from "../models/order.model";
import notificationService from "./notification.service";
import productService from "./product.service";

const payment = async (req: Request) => {
  const newOrder = new orderModel(req.body);
  const order = await newOrder.save();

  if (order) {
    const userId = order.userId.toString();
    const productIds = order.products.map((product) => product.productId);
    const notification = {
      userId: order.userId,
      message: "Đơn hàng của bạn đã được đặt thành công",
      typeOfNotification: "order",
      image: "",
      status: "active",
      idToReview: order._id,
    };
    await notificationService.addNotification(notification);
    for (const productId of productIds) {
      await inventoryModel.updateOne(
        {
          productId: productId,
          "reservations.userId": userId,
        },
        {
          $pull: {
            reservations: {
              userId: userId,
            },
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      await cartModel.updateOne(
        {
          userId: userId,
          "products.productId": productId,
        },
        {
          $pull: {
            products: {
              productId: productId,
            },
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
    }
  }
};

const cancelOrder = async (req: Request) => {
  const id = req.params.id;
  const order = await orderModel.findOne({ _id: id });
  const notification = {
    userId: order.userId,
    message: "Hủy đơn hàng thành công",
    typeOfNotification: "order",
    image: "",
    status: "active",
    idToReview: order._id,
  };
  await notificationService.addNotification(notification);
  const products = order.products.map((product) => product);

  for (const product of products) {
    await inventoryModel.updateOne(
      {
        productId: product.productId,
      },
      {
        $inc: {
          quantity: +product.quantity,
        },
      }
    );
  }
  await orderModel.findByIdAndUpdate(id, { status: 3 });
};

const updateStatusOrder = async (req: Request) => {
  const id = req.params.id;
  const status = req.body.status;
  const order = await orderModel.findByIdAndUpdate(id, { status });
  const getMessage = () => {
    if (status === 0) {
      return "Đơn hàng đang chờ được giao cho người giao hàng.";
    }
    if (status === 1) {
      return "Đơn hàng đang được giao.";
    }
    if (status === 2) {
      return "Đơn hàng đã được giao thành công";
    }
  };
  const notification = {
    userId: order.userId,
    message: getMessage(),
    typeOfNotification: "order",
    image: "",
    status: "active",
    idToReview: order._id,
  };
  await notificationService.addNotification(notification);
};

const updateShippingAddress = async (req: Request) => {
  const id = req.params.id;
  const shipping = req.body.shipping;
  const order = await orderModel.findByIdAndUpdate(id, { shipping });
  const getMessage = () => {
    return "Cập nhật địa điểm giao hàng thành công";
  };
  const notification = {
    userId: order.userId,
    message: getMessage(),
    typeOfNotification: "order",
    image: "",
    status: "active",
    idToReview: order._id,
  };
  await notificationService.addNotification(notification);
};

const listOrderByUser = async (req: Request) => {
  const userId = req.params.id;
  let listOrder = [];
  let pagination = null;

  let page: any = req.query.page;
  let limit: any = req.query.limit;
  let search: any = req.query.search;

  let searchInput: string;
  if (search && search.trim().length > 0) {
    searchInput = search;
  } else {
    searchInput = "";
  }
  const pages = parseInt(page);
  const limits = parseInt(limit);
  const skip = pages * limits - limits;

  const totals = await orderModel
    .find({
      userId: userId,
      ...(searchInput && { status: searchInput }),
    })
    .countDocuments({})
    .then((total) => total);
  await orderModel
    .find({
      userId: userId,
      ...(searchInput && { status: searchInput }),
    })
    .skip(skip)
    .limit(limits)
    .then((data) => {
      listOrder = data;
      pagination = {
        totalRows: data.length,
        page: page,
        totals: totals,
        totalPages: Math.ceil(totals / limit),
      };
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });
  const newList = [];
  for (let order of listOrder) {
    const newproducts = order.products.map(async (i: any) => {
      let newProduct = null;
      await productService.getProductById(i.productId).then((data) => {
        newProduct = data;
      });
      const curr = JSON.parse(JSON.stringify(i));
      const newData = {
        ...curr,
        productDetail: newProduct,
      };
      return newData;
    });
    const currOrder = JSON.parse(JSON.stringify(order));

    const data = await Promise.all(newproducts);

    const newOrder = {
      ...currOrder,
      products: data,
    };
    newList.push(newOrder);
  }

  const data = {
    data: newList,
    pagination: pagination,
  };

  return data;
};

const listAllOrders = async (req: Request) => {
  let orders = null;
  let pagination = null;
  let page: any = req.query.page;
  let limit: any = req.query.limit;
  let search: any = req.query.search;

  let searchInput: string;
  if (search && search.trim().length > 0) {
    searchInput = search;
  } else {
    searchInput = "";
  }

  const pages = parseInt(page);
  const limits = parseInt(limit);
  const skip = pages * limits - limits;
  const totals = await orderModel
    .find({
      ...(searchInput && {
        "products.productId": {
          $regex: ".*" + searchInput + ".*",
          $options: "i",
        },
      }),
    })
    .countDocuments({})
    .then((total) => total);

  await orderModel
    .find({
      ...(searchInput && {
        "products.productId": {
          $regex: ".*" + searchInput + ".*",
          $options: "i",
        },
      }),
    })
    .skip(skip)
    .limit(limits)
    .then((data) => {
      orders = data;
      pagination = {
        totalRows: data.length,
        page: page,
        totals: totals,
        totalPages: Math.ceil(totals / limit),
      };
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });
  const newList = [];
  for (let order of orders) {
    const newproducts = order.products.map(async (i: any) => {
      let newProduct = null;
      await productService.getProductById(i.productId).then((data) => {
        newProduct = data;
      });
      const curr = JSON.parse(JSON.stringify(i));
      const newData = {
        ...curr,
        productDetail: newProduct,
      };
      return newData;
    });
    const currOrder = JSON.parse(JSON.stringify(order));

    const data = await Promise.all(newproducts);

    const newOrder = {
      ...currOrder,
      products: data,
    };
    newList.push(newOrder);
  }

  const data = {
    data: newList,
    pagination: pagination,
  };

  return data;
};

const getOrderById = async (id: string) => {
  let order = null;

  await orderModel
    .findById(id)
    .then((data) => {
      order = data;
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });

  const products = order.products;

  const newProducts = products?.map(async (i: any) => {
    let newProduct = null;
    await productService.getProductById(i.productId).then((data) => {
      newProduct = data;
    });
    const curr = JSON.parse(JSON.stringify(i));
    const newData = {
      ...curr,
      productDetail: newProduct,
    };
    return newData;
  });

  const data = await Promise.all(newProducts);
  const currOrder = JSON.parse(JSON.stringify(order));

  const newOrder = {
    ...currOrder,
    products: data,
  };
  return newOrder;
};

export default {
  getOrderById,
  payment,
  updateShippingAddress,
  listOrderByUser,
  listAllOrders,
  updateStatusOrder,
  cancelOrder,
};
