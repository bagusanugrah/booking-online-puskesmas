'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Bookings', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      patient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Patients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      booking_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
      },
      document_url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Bookings');
  }
};