import Mongoose, { Schema } from "mongoose";
import status from '../enums/status';
import mongoosePaginate from "mongoose-paginate";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate";
const options = {
    collection: "newsLetters",
    timestamps: true
};

const schemaDefination = new Schema(
    {
		email: {
			type: String,
		},
		isSubscribed: {
			type: Boolean,
			default: true,
		},
	},
    options
);
schemaDefination.plugin(mongoosePaginate);
schemaDefination.plugin(mongooseAggregatePaginate);
module.exports = Mongoose.model("newsLetters", schemaDefination);

