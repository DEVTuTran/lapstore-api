import { Request } from "express";

import inventoryModel from "../models/inventory.model";
import productModel from "../models/product.model";

const addIventory = async (req: Request) => {
  const newIventory = new inventoryModel(req.body);
  const inventory = await newIventory.save();

  if (inventory) {
    const id = inventory.productId;
    const data = {
      status: 1,
    };
    await productModel
      .findByIdAndUpdate(id, data)
      .then((data) => {
        if (!data) {
          throw {
            status: 404,
            success: false,
            message: "Error! An error occurred.",
          };
        } else {
          return inventory;
        }
      })
      .catch((error) => {
        throw {
          status: error.status || 500,
          success: false,
          message: error.message,
        };
      });
  }
};

const getInventoryById = async (id: string) => {
  let inventory = null;
  await inventoryModel
    .findById(id)
    .then((data) => {
      if (!data) {
        throw {
          status: 404,
          success: false,
          message: "Inventory not found",
        };
      } else {
        inventory = data;
      }
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });
  return inventory;
};

const editInventory = async (req: Request) => {
  let success = false;
  const id = req.params.id;
  const data = req.body;
  await inventoryModel
    .findByIdAndUpdate(id, data)
    .then((data) => {
      if (!data) {
        throw {
          status: 404,
          success: false,
          message: "Product not found",
        };
      } else {
        success = true;
      }
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });

  return success;
};

const deleteInventory = async (req: Request, productId: String) => {
  let success = false;
  const id = req.params.id;
  await inventoryModel
    .findByIdAndDelete(id, req.body)
    .then((data) => {
      if (!data) {
        throw {
          status: 404,
          success: false,
          message: "Inventory not found",
        };
      } else {
        success = true;
      }
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });
  if (success) {
    const data = {
      status: 0,
    };
    await productModel
      .findByIdAndUpdate(productId, data)
      .then((data) => {
        if (!data) {
          throw {
            status: 404,
            success: false,
            message: "Error! An error occurred.",
          };
        }
      })
      .catch((error) => {
        throw {
          status: error.status || 500,
          success: false,
          message: error.message,
        };
      });
  }
  return success;
};

const getListInventory = async (req: Request) => {
  let inventory = null;

  let page: any = req.query.page;
  let limit: any = req.query.limit;
  let search: any = req.query.search;

  let searchInput: string;
  if (search && search.trim().length > 0) {
    searchInput = search;
  } else {
    searchInput = "";
  }

  if (page && limit) {
    const pages = parseInt(page);
    const limits = parseInt(limit);
    const skip = pages * limits - limits;
    const totals = await inventoryModel
      .find({
        productName: { $regex: ".*" + searchInput + ".*", $options: "i" },
      })
      .countDocuments({})
      .then((total) => total);
    await inventoryModel
      .find({
        productName: { $regex: ".*" + searchInput + ".*", $options: "i" },
      })
      .skip(skip)
      .limit(limits)
      .then((data) => {
        if (!data) {
          throw {
            status: 404,
            success: false,
            message: "Products not found",
          };
        } else {
          inventory = {
            data: data,
            pagination: {
              totalRows: data.length,
              page: page,
              totals: totals,
              totalPages: Math.ceil(totals / limit),
            },
          };
        }
      })
      .catch((error) => {
        throw {
          status: error.status || 500,
          success: false,
          message: error.message,
        };
      });
  } else {
    await inventoryModel
      .find()
      .then((data) => {
        if (!data) {
          throw {
            status: 404,
            success: false,
            message: "Inventory not found",
          };
        } else {
          inventory = data;
        }
      })
      .catch((error) => {
        throw {
          status: error.status || 500,
          success: false,
          message: error.message,
        };
      });
  }
  return inventory;
};

const getProductBrand = async (req: Request) => {
  const brandId = req.params.id;

  let page: any = req.query.page || 1;
  let limit: any = req.query.limit || 10;
  let sort: any = req.query.sort;
  let filters: any = req.query.filters;

  let products = null;
  const pages = parseInt(page);
  const limits = parseInt(limit);
  const skip = pages * limits - limits;
  let sorts = null;
  if (sort === "lowToHigh") {
    sorts = 1;
  } else {
    sorts = -1;
  }
  const filter = JSON.parse(filters);
  const ram = filter?.ram.length > 0 ? filter?.ram : ["8GB", "16GB", "32GB"];
  const cpu =
    filter?.cpu.length > 0
      ? filter?.cpu
      : [
          "M1",
          "M2",
          "Core I3",
          "Core I5",
          "Core I7",
          "Ryzen 3",
          "Ryzen 5",
          "Ryzen 7",
        ];
  const screen =
    filter?.screen.length > 0 ? filter?.screen : ["13.3", "13.6", "14", "16"];

  const totals = await productModel
    .countDocuments({
      brand: brandId,
      ram: { $in: ram },
      cpu: { $in: cpu },
      screen: { $in: screen },

      price: {
        $gte: parseInt(filter?.priceFrom || 0),
        $lt: parseInt(filter?.priceTo || 900000000),
      },
    })
    .then((total) => total);
  await productModel
    .find({
      brand: brandId,
      ram: { $in: ram },
      cpu: { $in: cpu },
      screen: { $in: screen },

      price: {
        $gte: parseInt(filter?.priceFrom || 0),
        $lt: parseInt(filter?.priceTo || 900000000),
      },
    })
    .sort({ price: sorts })
    .skip(skip)
    .limit(limits)
    .then((data) => {
      if (!data) {
        throw {
          status: 404,
          success: false,
          message: "Products not found",
        };
      } else {
        products = {
          data: data,
          pagination: {
            totalRows: data.length,
            page: page,
            totals: totals,
            totalPages: Math.ceil(totals / limit),
          },
        };
      }
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });

  return products;
};

const getInventoryByBrand = async (req: Request) => {
  const brandId = req.params.id;
  let products = null;
  let inventories = null;
  const listData = [];
  let pagination = null;
  let sale = 0;
  let page: any = req.query.page;
  let limit: any = req.query.limit;
  let search: any = req.query.search;

  let searchInput: string;
  if (search && search.trim().length > 0) {
    searchInput = search;
  } else {
    searchInput = "";
  }

  if (page && limit) {
    const pages = parseInt(page);
    const limits = parseInt(limit);
    const skip = pages * limits - limits;
    const totals = await productModel
      .find({
        brand: brandId,
        productName: { $regex: ".*" + searchInput + ".*", $options: "i" },
      })
      .countDocuments({})
      .then((total) => total);
    await productModel
      .find({
        brand: brandId,
        productName: { $regex: ".*" + searchInput + ".*", $options: "i" },
      })
      .skip(skip)
      .limit(limits)
      .then((data) => {
        products = data;

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
    for (const product of products) {
      await inventoryModel
        .findOne({ productId: product._id })
        .then((data) => {
          if (data) {
            sale = data.reservations.reduce(
              (pre, cur) => pre + cur.quantity,
              0
            );
          }
        })
        .catch((error) => {
          throw {
            status: error.status || 500,
            success: false,
            message: error.message,
          };
        });

      const newData = JSON.parse(JSON.stringify(product));

      listData.push({ ...newData, sale: sale });
    }
  }
  inventories = {
    data: listData,
    pagination: pagination,
  };
  return inventories;
};

const searchInventory = async (req: Request) => {
  const text = req.query.search;
  let inventory = null;
  let newInventory = null;

  let page: any = req.query.page || 1;
  let limit: any = req.query.limit || 10;
  let sort: any = req.query.sort;
  let filters: any = req.query.filters;

  const pages = parseInt(page);
  const limits = parseInt(limit);
  const skip = pages * limits - limits;

  let sorts = null;
  if (sort === "lowToHigh") {
    sorts = 1;
  } else {
    sorts = -1;
  }
  const filter = JSON.parse(filters);
  const ram = filter?.ram.length > 0 ? filter?.ram : ["8GB", "16GB", "32GB"];
  const cpu =
    filter?.cpu.length > 0
      ? filter?.cpu
      : [
          "M1",
          "M2",
          "Core I3",
          "Core I5",
          "Core I7",
          "Ryzen 3",
          "Ryzen 5",
          "Ryzen 7",
        ];
  const screen =
    filter?.screen.length > 0 ? filter?.screen : ["13.3", "13.6", "14", "16"];

  const totals = await productModel
    .countDocuments({
      $text: { $search: `"\"${text}"\"` },
      ram: { $in: ram },
      cpu: { $in: cpu },
      screen: { $in: screen },

      price: {
        $gte: parseInt(filter?.priceFrom || 0),
        $lt: parseInt(filter?.priceTo || 900000000),
      },
    })
    .then((total) => total);
  await productModel
    .find({
      $text: { $search: `"\"${text}"\"` },
      ram: { $in: ram },
      cpu: { $in: cpu },
      screen: { $in: screen },

      price: {
        $gte: parseInt(filter?.priceFrom || 0),
        $lt: parseInt(filter?.priceTo || 900000000),
      },
    })
    .sort({ price: sorts })
    .skip(skip)
    .limit(limits)
    .then((data) => {
      if (!data) {
        throw {
          status: 404,
          success: false,
          message: "Products not found",
        };
      } else {
        inventory = {
          data: data,
          pagination: {
            totalRows: data.length,
            page: page,
            totals: totals,
            totalPages: Math.ceil(totals / limit),
          },
        };
      }
    })
    .catch((error) => {
      throw {
        status: error.status || 500,
        success: false,
        message: error.message,
      };
    });

  return inventory;
};

export default {
  addIventory,
  deleteInventory,
  editInventory,
  getInventoryById,
  getListInventory,
  getInventoryByBrand,
  searchInventory,
  getProductBrand,
};
