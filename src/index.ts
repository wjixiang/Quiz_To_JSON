import { synchronizer } from "./mongodbSynchronizer";
import { removeDuplicates } from "./dbDedupe";

class app {
    synchronizer = new synchronizer();
    removeDuplicates = removeDuplicates; //删除重复记录
}