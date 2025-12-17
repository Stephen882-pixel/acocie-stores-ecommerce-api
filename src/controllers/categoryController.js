
const createCategory = async (req,res) => {
    try{
        
    } catch (error){
        console.error('Error in createCategory:',error);
        res.status(500).json({error:'Failed to create category'});
    }
};