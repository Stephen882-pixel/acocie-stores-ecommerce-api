

const { User, Address, LoginHistory } = require('../../models');
const { Op } = require('sequelize');

const getProfile = async (req,res) => {
    try{
        const userId = req.user.userId;

        const user = await User.findByPk(userId,{
            attributes: { exclude: ['passwordHash'] },
            include:[
                {
                    model:Address,
                    as:'addresses'
                }
            ]
        });

        if(!user){
            return res.status(404).json({error: 'User not found'});
        }

        res.json({ user })

    } catch (error){
        console.error('Error in getting profile:', error);
        res.status(500).json({error:'Failed to fetch profile'});
    }
};



const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phone } = req.body;


    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({
        where: {
          phone,
          id: { [Op.ne]: userId }
        }
      });

      if (existingPhone) {
        return res.status(409).json({ error: 'Phone already in use' });
      }
    }

    await user.update({ firstName, lastName, phone });

  
    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Error in update profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};


const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const addresses = await Address.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({ addresses });
  } catch (error) {
    console.error('Error in getAddresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
};

const addAddress = async (req,res) => {
    try{
        const userId = req.user.userId;
        const {
        label,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        isDefault
        } = req.body;
    
    if (!fullName || !phone || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({ error: 'Required address fields are missing' });
    }

    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    const address = await Address.create({
      userId,
      label,
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country: country || 'Kenya',
      isDefault: isDefault || false
    });

    res.status(201).json({
      message: 'Address added successfully',
      address
    });


    } catch (error){
        console.error('Error in addAddress:', error);
        res.status(500).json({ error: 'Failed to add address' });
    }
};

const updateAddress = async (req,res) => {
    try{
        const userId = req.user.userId;
        const { id } = req.params;
        const updateData = req.body;

        const address = await Address.findOne({
            where: { id,userId }
        });

        if(!address){
            return res.status(404).json({
                error:'Address not found'
            });
        }

        if(updateData.isDefault){
            await Address.update(
                { isDefault: false },
                { where: { userId,id: {[Op.ne]: id} } }
            );
        }
        await address.update(updateData);

        res.json({
            message: 'Address updated successfully',
            address
        });
    } catch (error){
        console.error('Error in update address:', error);
        res.status(500).json({
            error:'Failed to update address'
        });
    }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await address.destroy();

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAddress:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
};

const getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const history = await LoginHistory.findAll({
      where: { userId },
      order: [['loginAt', 'DESC']],
      limit
    });

    res.json({ history });
  } catch (error) {
    console.error('Error in getLoginHistory:', error);
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
};


const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const authUtils = require('../../utils/authUtils');
    const isPasswordValid = await authUtils.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await user.destroy();

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAccount:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getLoginHistory,
  deleteAccount
};

