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
  exports.updateFareConfig = async (req, res) => {
    let config = await FareConfig.findOne();
    if (!config) config = new FareConfig();
  
    Object.assign(config, req.body);
    await config.save();
  
    res.json({ success: true, config });
  };
  