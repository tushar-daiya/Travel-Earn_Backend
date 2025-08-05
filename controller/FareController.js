const FareConfig = require('../model/FareConfig')

// Get current config
exports.getFareConfig = async (req, res) => {
    let config = await FareConfig.findOne();
    if(!config){
        config = await FareConfig.create({});
    }
    res.json(config);
  };

  // Update config
  // exports.updateFareConfig = async (req, res) => {
  //   let config = await FareConfig.findOne();
  //   if (!config) config = new FareConfig();
  
  //   Object.assign(config, req.body);
  //   await config.save();
  
  //   res.json({ success: true, config });
  // };
  
  exports.updateFareConfig = async (req, res) => {
    try {
        let config = await FareConfig.findOne();
        if (!config) {
            config = new FareConfig();
        }

        // Only update fields that exist in the schema
        const allowedFields = [
            'TE', 'deliveryFee', 'margin', 'weightRateTrain', 
            'weightRateAirplane', 'distanceRateTrain', 'distanceRateAirplane',
            'baseFareTrain', 'baseFareAirplane'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                config[field] = parseFloat(req.body[field]) || 0;
            }
        });

        await config.save();

        res.json({ success: true, config });

    } catch (error) {
        console.error('Error updating fare config:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update fare configuration' 
        });
    }
};