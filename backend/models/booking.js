'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Booking.belongsTo(models.Patient, { foreignKey: 'patient_id' });
    }
  }
  Booking.init({
    patient_id: DataTypes.INTEGER,
    booking_date: DataTypes.DATE,
    status: DataTypes.STRING,
    document_url: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Booking',
  });
  return Booking;
};